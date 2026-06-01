<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ClientCompanyController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $companies = ClientCompany::query()
                ->orderBy('name')
                ->get()
                ->map(fn (ClientCompany $company) => $this->serializeCompany($company));

            return response()->json(['companies' => $companies]);
        } catch (\Throwable $exception) {
            return response()->json(['message' => 'Client companies hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata')], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'accountType' => ['nullable', 'string', 'in:individual,corporate'],
            'code' => ['nullable', 'string', 'max:120'],
            'username' => ['nullable', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
            'contactName' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'taxNumber' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'mealUnitPrice' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'mealVatEnabled' => ['nullable', 'boolean'],
        ]);

        $code = Str::slug($validated['code'] ?? $validated['username'] ?? $this->makeCompanyCode($validated['name']));
        $username = Str::slug($validated['username'] ?? $code);

        if (ClientCompany::where('code', $code)->exists()) {
            return response()->json(['message' => 'Bu uyelik kodu zaten kullaniliyor.'], 422);
        }

        if (ClientCompany::where('username', $username)->exists()) {
            return response()->json(['message' => 'Bu kullanici adi zaten kullaniliyor.'], 422);
        }

        try {
            $attributes = [
                'name' => $validated['name'],
                'code' => $code,
                'username' => $username,
                'password_hash' => Hash::make($validated['password'] ?? Str::random(10)),
                'contact_name' => $validated['contactName'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'address' => $validated['address'] ?? null,
                'tax_number' => $validated['taxNumber'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'meal_unit_price' => $validated['mealUnitPrice'] ?? 170,
                'meal_vat_enabled' => $validated['mealVatEnabled'] ?? false,
                'active' => true,
            ];

            if (Schema::hasColumn('client_companies', 'account_type')) {
                $attributes['account_type'] = $validated['accountType'] ?? 'corporate';
            }

            $company = ClientCompany::create($attributes);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Client company olusturma hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
                'type' => config('app.debug') ? $exception::class : null,
            ], 500);
        }

        return response()->json(['company' => $this->serializeCompany($company)], 201);
    }

    public function update(Request $request, ClientCompany $clientCompany): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contactName' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'taxNumber' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'mealUnitPrice' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'mealVatEnabled' => ['nullable', 'boolean'],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
            'active' => ['nullable', 'boolean'],
        ]);

        $updates = [
            'name' => $validated['name'],
            'contact_name' => $validated['contactName'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'tax_number' => $validated['taxNumber'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'meal_unit_price' => $validated['mealUnitPrice'] ?? $clientCompany->meal_unit_price ?? 170,
            'meal_vat_enabled' => $validated['mealVatEnabled'] ?? $clientCompany->meal_vat_enabled ?? false,
            'active' => $validated['active'] ?? $clientCompany->active,
        ];

        if (! empty($validated['password'])) {
            $updates['password_hash'] = Hash::make($validated['password']);
        }

        $clientCompany->update($updates);

        return response()->json(['company' => $this->serializeCompany($clientCompany->fresh())]);
    }

    public function updatePassword(Request $request, string $companyCode): JsonResponse
    {
        $validated = $request->validate([
            'currentPassword' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ]);

        $loginSlug = Str::slug($companyCode);
        $company = ClientCompany::where(function ($query) use ($loginSlug) {
            $query->where('code', $loginSlug)->orWhere('username', $loginSlug);
        })
            ->where('active', true)
            ->first();

        if (! $company || ($company->role ?? 'customer') !== 'customer' || $company->hidden) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        if (! $company->password_hash || ! Hash::check($validated['currentPassword'], $company->password_hash)) {
            return response()->json(['message' => 'Mevcut sifre hatali.'], 422);
        }

        $company->update(['password_hash' => Hash::make($validated['password'])]);

        return response()->json(['message' => 'Sifre guncellendi.']);
    }

    public function destroy(ClientCompany $clientCompany): JsonResponse
    {
        $clientCompany->delete();

        return response()->json(['message' => 'Sirket uyeligi silindi.']);
    }

    public function showByCode(string $companyCode): JsonResponse
    {
        $slug = Str::slug($companyCode);
        $company = ClientCompany::where(function ($query) use ($slug) {
            $query->where('code', $slug)->orWhere('username', $slug);
        })
            ->where('active', true)
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        return response()->json(['company' => $this->serializeCompany($company)]);
    }

    public function login(Request $request): JsonResponse
    {
        try {
            $username = Str::slug((string) $request->input('username'));
            $password = (string) $request->input('password');

            $ownerPassword = (string) env('OWNER_PASSWORD', '');

            if ($username === 'admin' && $ownerPassword !== '' && hash_equals($ownerPassword, $password)) {
                return response()->json([
                    'user' => [
                        'username' => 'admin',
                        'role' => 'admin',
                        'displayName' => config('app.name'),
                    ],
                ]);
            }

            $validated = $request->validate([
                'username' => ['required', 'string', 'max:120'],
                'password' => ['required', 'string', 'max:255'],
            ]);

            $loginSlug = Str::slug($validated['username']);
            $company = ClientCompany::where(function ($query) use ($loginSlug) {
                $query->where('username', $loginSlug)->orWhere('code', $loginSlug);
            })
                ->where('active', true)
                ->first();

            if (! $company || ! $company->password_hash || ! Hash::check($validated['password'], $company->password_hash)) {
                return response()->json(['message' => 'Kullanici adi veya sifre hatali.'], 422);
            }

            return response()->json([
                'user' => [
                    'username' => $company->username,
                    'role' => 'customer',
                    'companyCode' => $company->code,
                    'displayName' => $company->name,
                ],
            ]);
        } catch (\Throwable $exception) {
            return response()->json(['message' => 'Backend hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata')], 500);
        }
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
            'username' => $company->username,
            'name' => $company->name,
            'accountType' => $company->account_type ?? 'corporate',
            'contactName' => $company->contact_name,
            'phone' => $company->phone,
            'email' => $company->email,
            'address' => $company->address,
            'taxNumber' => $company->tax_number,
            'notes' => $company->notes,
            'mealUnitPrice' => (float) ($company->meal_unit_price ?? 170),
            'mealVatEnabled' => (bool) ($company->meal_vat_enabled ?? false),
            'active' => $company->active,
            'createdAt' => $company->created_at?->toISOString(),
            'updatedAt' => $company->updated_at?->toISOString(),
        ];
    }
}
