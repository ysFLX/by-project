<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClientCompanyController extends Controller
{
    public function index(): JsonResponse
    {
        $companies = ClientCompany::query()
            ->orderBy('name')
            ->get()
            ->map(fn (ClientCompany $company) => $this->serializeCompany($company));

        return response()->json(['companies' => $companies]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:120'],
            'contactName' => ['nullable', 'string', 'max:255'],
        ]);

        $code = $validated['code'] ?? $this->makeCompanyCode($validated['name']);
        $code = Str::slug($code);

        if (ClientCompany::where('code', $code)->exists()) {
            return response()->json(['message' => 'Bu üyelik kodu zaten kullanılıyor.'], 422);
        }

        $company = ClientCompany::create([
            'name' => $validated['name'],
            'code' => $code,
            'contact_name' => $validated['contactName'] ?? null,
            'active' => true,
        ]);

        return response()->json(['company' => $this->serializeCompany($company)], 201);
    }

    public function showByCode(string $companyCode): JsonResponse
    {
        $company = ClientCompany::where('code', Str::slug($companyCode))->first();

        if (! $company) {
            return response()->json(['message' => 'Şirket üyeliği bulunamadı.'], 404);
        }

        return response()->json(['company' => $this->serializeCompany($company)]);
    }

    private function makeCompanyCode(string $name): string
    {
        $baseCode = Str::slug($name) ?: 'sirket';
        $code = $baseCode;
        $suffix = 2;

        while (ClientCompany::where('code', $code)->exists()) {
            $code = "{$baseCode}-{$suffix}";
            $suffix++;
        }

        return $code;
    }

    private function serializeCompany(ClientCompany $company): array
    {
        return [
            'id' => (string) $company->id,
            'code' => $company->code,
            'name' => $company->name,
            'contactName' => $company->contact_name,
            'active' => $company->active,
            'createdAt' => $company->created_at?->toISOString(),
            'updatedAt' => $company->updated_at?->toISOString(),
        ];
    }
}
