<?php

use App\Http\Controllers\Api\ClientCompanyController;
use App\Http\Controllers\Api\MealRequestController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

Route::post('/auth/login', function () {
    $username = Str::slug((string) request('username'));
    $password = (string) request('password');

    if ($username === 'admin' && hash_equals((string) env('ADMIN_PASSWORD', 'admin123'), $password)) {
        return response()->json([
            'user' => [
                'username' => 'admin',
                'role' => 'admin',
                'displayName' => config('app.name'),
            ],
        ]);
    }

    return app(ClientCompanyController::class)->login(request());
});

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
    } catch (Throwable $exception) {
        return response()->json([
            'status' => 'error',
            'app' => config('app.name'),
            'database' => config('database.default'),
            'message' => $exception->getMessage(),
            'time' => now()->toISOString(),
        ], 503);
    }

    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'database' => config('database.default'),
        'time' => now()->toISOString(),
    ]);
});

Route::get('/debug/schema', function () {
    $tables = ['client_companies', 'meal_requests', 'meal_request_counters'];

    return response()->json([
        'database' => config('database.connections.mysql.database'),
        'tables' => collect($tables)->mapWithKeys(function (string $table) {
            try {
                $columns = Schema::hasTable($table)
                    ? DB::table('information_schema.columns')
                        ->select(['column_name', 'column_type', 'column_key', 'extra', 'is_nullable', 'column_default'])
                        ->whereRaw('table_schema = DATABASE()')
                        ->where('table_name', $table)
                        ->orderBy('ordinal_position')
                        ->get()
                    : [];

                return [
                    $table => [
                        'exists' => Schema::hasTable($table),
                        'columns' => Schema::hasTable($table) ? Schema::getColumnListing($table) : [],
                        'details' => $columns,
                    ],
                ];
            } catch (Throwable $exception) {
                return [
                    $table => [
                        'exists' => false,
                        'error' => $exception->getMessage(),
                    ],
                ];
            }
        }),
    ]);
});

Route::get('/client-companies', function () {
    try {
        $companies = DB::table('client_companies')
            ->orderBy('name')
            ->get()
            ->map(fn ($company) => [
                'id' => (string) $company->id,
                'code' => $company->code,
                'username' => $company->username,
                'accountType' => $company->account_type ?? 'corporate',
                'name' => $company->name,
                'contactName' => $company->contact_name,
                'phone' => $company->phone,
                'email' => $company->email,
                'address' => $company->address,
                'taxNumber' => $company->tax_number,
                'notes' => $company->notes,
                'active' => (bool) $company->active,
                'createdAt' => $company->created_at,
                'updatedAt' => $company->updated_at,
            ]);

        return response()->json(['companies' => $companies]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Client companies hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});
Route::post('/client-companies', [ClientCompanyController::class, 'store']);
Route::put('/client-companies/{clientCompany}', [ClientCompanyController::class, 'update']);
Route::delete('/client-companies/{clientCompany}', [ClientCompanyController::class, 'destroy']);
Route::get('/client-companies/{companyCode}', [ClientCompanyController::class, 'showByCode']);

Route::get('/meal-requests', function () {
    try {
        $serviceDate = request()->query('serviceDate', now()->toDateString());
        $companyCode = request()->query('companyCode');

        $requests = DB::table('meal_requests')
            ->join('client_companies', 'client_companies.id', '=', 'meal_requests.client_company_id')
            ->select([
                'meal_requests.request_no',
                'meal_requests.client_company_id',
                'meal_requests.service_date',
                'meal_requests.headcount',
                'meal_requests.status',
                'meal_requests.note',
                'meal_requests.created_at',
                'meal_requests.eaten_at',
                'meal_requests.collected_at',
                'meal_requests.updated_at',
                'client_companies.code as company_code',
                'client_companies.name as company_name',
            ])
            ->whereDate('meal_requests.service_date', $serviceDate)
            ->when($companyCode, fn ($query) => $query->where('client_companies.code', Str::slug((string) $companyCode)))
            ->orderByDesc('meal_requests.updated_at')
            ->get()
            ->map(fn ($mealRequest) => [
                'requestNo' => $mealRequest->request_no,
                'companyId' => (string) $mealRequest->client_company_id,
                'companyCode' => $mealRequest->company_code,
                'companyName' => $mealRequest->company_name,
                'serviceDate' => $mealRequest->service_date,
                'headcount' => (int) $mealRequest->headcount,
                'status' => $mealRequest->status,
                'note' => $mealRequest->note,
                'submittedAt' => $mealRequest->created_at,
                'eatenAt' => $mealRequest->eaten_at,
                'collectedAt' => $mealRequest->collected_at,
                'updatedAt' => $mealRequest->updated_at,
            ]);

        return response()->json(['requests' => $requests]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Meal requests hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});
Route::post('/meal-requests', [MealRequestController::class, 'store']);
Route::patch('/meal-requests/{requestNo}', [MealRequestController::class, 'updateStatus']);
