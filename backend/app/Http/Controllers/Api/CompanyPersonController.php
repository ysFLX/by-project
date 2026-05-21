<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientCompany;
use App\Models\CompanyPerson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CompanyPersonController extends Controller
{
    public function index(string $companyCode): JsonResponse
    {
        $company = $this->findCompany($companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        $people = $company->people()
            ->orderByDesc('active')
            ->orderBy('name')
            ->get()
            ->map(fn (CompanyPerson $person) => $this->serializePerson($person));

        return response()->json(['people' => $people]);
    }

    public function store(Request $request, string $companyCode): JsonResponse
    {
        $company = $this->findCompany($companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'employeeCode' => [
                'nullable',
                'string',
                'max:120',
                Rule::unique('company_people', 'employee_code')->where('client_company_id', $company->id),
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $person = $company->people()->create([
            'name' => $validated['name'],
            'department' => $validated['department'] ?? null,
            'employee_code' => $validated['employeeCode'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'active' => true,
        ]);

        return response()->json(['person' => $this->serializePerson($person)], 201);
    }

    public function update(Request $request, string $companyCode, CompanyPerson $person): JsonResponse
    {
        $company = $this->findCompany($companyCode);

        if (! $company || $person->client_company_id !== $company->id) {
            return response()->json(['message' => 'Kisi bulunamadi.'], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'employeeCode' => [
                'nullable',
                'string',
                'max:120',
                Rule::unique('company_people', 'employee_code')
                    ->where('client_company_id', $company->id)
                    ->ignore($person->id),
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
            'active' => ['nullable', 'boolean'],
        ]);

        $person->update([
            'name' => $validated['name'],
            'department' => $validated['department'] ?? null,
            'employee_code' => $validated['employeeCode'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'active' => $validated['active'] ?? $person->active,
        ]);

        return response()->json(['person' => $this->serializePerson($person->fresh())]);
    }

    public function destroy(string $companyCode, CompanyPerson $person): JsonResponse
    {
        $company = $this->findCompany($companyCode);

        if (! $company || $person->client_company_id !== $company->id) {
            return response()->json(['message' => 'Kisi bulunamadi.'], 404);
        }

        $person->update(['active' => false]);

        return response()->json(['message' => 'Kisi pasife alindi.']);
    }

    private function findCompany(string $companyCode): ?ClientCompany
    {
        return ClientCompany::where('code', Str::slug($companyCode))
            ->where('active', true)
            ->first();
    }

    private function serializePerson(CompanyPerson $person): array
    {
        return [
            'id' => (string) $person->id,
            'companyId' => (string) $person->client_company_id,
            'name' => $person->name,
            'department' => $person->department,
            'employeeCode' => $person->employee_code,
            'notes' => $person->notes,
            'active' => $person->active,
            'createdAt' => $person->created_at?->toISOString(),
            'updatedAt' => $person->updated_at?->toISOString(),
        ];
    }
}
