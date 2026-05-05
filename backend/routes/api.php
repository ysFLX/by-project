<?php

use App\Http\Controllers\Api\ClientCompanyController;
use App\Http\Controllers\Api\MealRequestController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    DB::connection()->getPdo();

    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'database' => config('database.default'),
        'time' => now()->toISOString(),
    ]);
});

Route::get('/client-companies', [ClientCompanyController::class, 'index']);
Route::post('/client-companies', [ClientCompanyController::class, 'store']);
Route::get('/client-companies/{companyCode}', [ClientCompanyController::class, 'showByCode']);

Route::get('/meal-requests', [MealRequestController::class, 'index']);
Route::post('/meal-requests', [MealRequestController::class, 'store']);
Route::patch('/meal-requests/{requestNo}', [MealRequestController::class, 'updateStatus']);
