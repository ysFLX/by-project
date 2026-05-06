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
                return [
                    $table => [
                        'exists' => Schema::hasTable($table),
                        'columns' => Schema::hasTable($table) ? Schema::getColumnListing($table) : [],
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

Route::get('/client-companies', [ClientCompanyController::class, 'index']);
Route::post('/client-companies', [ClientCompanyController::class, 'store']);
Route::put('/client-companies/{clientCompany}', [ClientCompanyController::class, 'update']);
Route::delete('/client-companies/{clientCompany}', [ClientCompanyController::class, 'destroy']);
Route::get('/client-companies/{companyCode}', [ClientCompanyController::class, 'showByCode']);

Route::get('/meal-requests', [MealRequestController::class, 'index']);
Route::post('/meal-requests', [MealRequestController::class, 'store']);
Route::patch('/meal-requests/{requestNo}', [MealRequestController::class, 'updateStatus']);
