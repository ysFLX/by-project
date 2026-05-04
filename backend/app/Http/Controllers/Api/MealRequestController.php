<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientCompany;
use App\Models\MealRequest;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MealRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $serviceDate = $request->query('serviceDate', now()->toDateString());
        $companyCode = $request->query('companyCode');

        $requests = MealRequest::query()
            ->with('company')
            ->whereDate('service_date', $serviceDate)
            ->when($companyCode, function ($query) use ($companyCode) {
                $query->whereHas('company', fn ($companyQuery) => $companyQuery->where('code', Str::slug($companyCode)));
            })
            ->latest('updated_at')
            ->get()
            ->map(fn (MealRequest $mealRequest) => $this->serializeMealRequest($mealRequest));

        return response()->json(['requests' => $requests]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'companyCode' => ['required', 'string', 'max:120'],
            'serviceDate' => ['nullable', 'date_format:Y-m-d'],
            'headcount' => ['required', 'integer', 'min:1', 'max:100000'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $company = ClientCompany::where('code', Str::slug($validated['companyCode']))
            ->where('active', true)
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Aktif şirket üyeliği bulunamadı.'], 404);
        }

        $serviceDate = $validated['serviceDate'] ?? now()->toDateString();

        $mealRequest = DB::transaction(function () use ($company, $serviceDate, $validated) {
            $existingRequest = MealRequest::where('client_company_id', $company->id)
                ->whereDate('service_date', $serviceDate)
                ->lockForUpdate()
                ->first();

            if ($existingRequest) {
                if ($existingRequest->status !== MealRequest::STATUS_SUBMITTED) {
                    throw ValidationException::withMessages([
                        'headcount' => 'Yemek yenildi onaylandıktan sonra kişi sayısı değiştirilemez.',
                    ]);
                }

                $existingRequest->update([
                    'headcount' => $validated['headcount'],
                    'note' => $validated['note'] ?? null,
                ]);

                return $existingRequest->fresh('company');
            }

            return MealRequest::create([
                'request_no' => $this->nextRequestNo(),
                'client_company_id' => $company->id,
                'service_date' => $serviceDate,
                'headcount' => $validated['headcount'],
                'status' => MealRequest::STATUS_SUBMITTED,
                'note' => $validated['note'] ?? null,
            ])->fresh('company');
        });

        return response()->json(['request' => $this->serializeMealRequest($mealRequest)], 201);
    }

    public function updateStatus(Request $request, string $requestNo): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([MealRequest::STATUS_EATEN, MealRequest::STATUS_COLLECTED])],
        ]);

        $mealRequest = MealRequest::with('company')->where('request_no', $requestNo)->first();

        if (! $mealRequest) {
            return response()->json(['message' => 'Yemek talebi bulunamadı.'], 404);
        }

        if ($validated['status'] === MealRequest::STATUS_EATEN) {
            $mealRequest->status = MealRequest::STATUS_EATEN;
            $mealRequest->eaten_at ??= now();
        }

        if ($validated['status'] === MealRequest::STATUS_COLLECTED) {
            $mealRequest->status = MealRequest::STATUS_COLLECTED;
            $mealRequest->eaten_at ??= now();
            $mealRequest->collected_at = now();
        }

        $mealRequest->save();

        return response()->json(['request' => $this->serializeMealRequest($mealRequest->fresh('company'))]);
    }

    private function nextRequestNo(): string
    {
        $counter = DB::table('meal_request_counters')
            ->where('key', 'meal_request')
            ->lockForUpdate()
            ->first();

        if (! $counter) {
            DB::table('meal_request_counters')->insert([
                'key' => 'meal_request',
                'next_value' => 2,
            ]);

            return 'Y0001';
        }

        DB::table('meal_request_counters')
            ->where('key', 'meal_request')
            ->update(['next_value' => $counter->next_value + 1]);

        return 'Y'.str_pad((string) $counter->next_value, 4, '0', STR_PAD_LEFT);
    }

    private function serializeMealRequest(MealRequest $mealRequest): array
    {
        $company = $mealRequest->company;

        return [
            'requestNo' => $mealRequest->request_no,
            'companyId' => (string) $company->id,
            'companyCode' => $company->code,
            'companyName' => $company->name,
            'serviceDate' => CarbonImmutable::parse($mealRequest->service_date)->toDateString(),
            'headcount' => $mealRequest->headcount,
            'status' => $mealRequest->status,
            'note' => $mealRequest->note,
            'submittedAt' => $mealRequest->created_at?->toISOString(),
            'eatenAt' => $mealRequest->eaten_at?->toISOString(),
            'collectedAt' => $mealRequest->collected_at?->toISOString(),
            'updatedAt' => $mealRequest->updated_at?->toISOString(),
        ];
    }
}
