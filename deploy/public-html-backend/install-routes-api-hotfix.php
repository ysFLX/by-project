<?php

$token = 'maharet-routes-hotfix-20260507';

if (($_GET['token'] ?? '') !== $token) {
    http_response_code(404);
    exit('Not found.');
}

$appPath = realpath(__DIR__.'/../../maharet-api');

if ($appPath === false) {
    http_response_code(500);
    exit('Laravel application path not found.');
}

$result = [
    'appPath' => $appPath,
    'createdDirectories' => [],
    'writtenFiles' => [],
    'deletedCacheFiles' => [],
    'opcacheReset' => false,
    'errors' => [],
];

foreach ([
    $appPath.'/storage/framework/cache/data',
    $appPath.'/storage/framework/sessions',
    $appPath.'/storage/framework/views',
    $appPath.'/storage/logs',
] as $directory) {
    if (! is_dir($directory) && @mkdir($directory, 0755, true)) {
        $result['createdDirectories'][] = $directory;
    }
}

$routes = <<<'PHP'
<?php

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

$serializeCompany = function ($company): array {
    return [
        'id' => (string) $company->id,
        'code' => $company->code,
        'username' => $company->username,
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
    ];
};

$serializeMealRequest = function ($mealRequest): array {
    return [
        'requestNo' => $mealRequest->request_no,
        'companyId' => (string) $mealRequest->client_company_id,
        'companyCode' => $mealRequest->company_code,
        'companyName' => $mealRequest->company_name,
        'serviceDate' => CarbonImmutable::parse($mealRequest->service_date)->toDateString(),
        'headcount' => (int) $mealRequest->headcount,
        'status' => $mealRequest->status,
        'note' => $mealRequest->note,
        'submittedAt' => $mealRequest->created_at,
        'eatenAt' => $mealRequest->eaten_at,
        'collectedAt' => $mealRequest->collected_at,
        'updatedAt' => $mealRequest->updated_at,
    ];
};

Route::post('/auth/login', function () use ($serializeCompany) {
    try {
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

        request()->validate([
            'username' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $company = DB::table('client_companies')
            ->where('username', $username)
            ->where('active', true)
            ->first();

        if (! $company || ! $company->password_hash || ! Hash::check($password, $company->password_hash)) {
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
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Backend hata: '.$exception->getMessage()], 500);
    }
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
        'database' => DB::selectOne('SELECT DATABASE() AS db')->db ?? null,
        'tables' => collect($tables)->mapWithKeys(function (string $table) {
            $details = Schema::hasTable($table)
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
                    'details' => $details,
                ],
            ];
        }),
    ]);
});

Route::get('/client-companies', function () use ($serializeCompany) {
    try {
        $companies = DB::table('client_companies')->orderBy('name')->get()->map($serializeCompany);

        return response()->json(['companies' => $companies]);
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Client companies hata: '.$exception->getMessage()], 500);
    }
});

Route::post('/client-companies', function () use ($serializeCompany) {
    $validated = request()->validate([
        'name' => ['required', 'string', 'max:255'],
        'code' => ['nullable', 'string', 'max:120'],
        'username' => ['nullable', 'string', 'max:120'],
        'password' => ['nullable', 'string', 'min:4', 'max:255'],
        'contactName' => ['nullable', 'string', 'max:255'],
        'phone' => ['nullable', 'string', 'max:255'],
        'email' => ['nullable', 'email', 'max:255'],
        'address' => ['nullable', 'string', 'max:255'],
        'taxNumber' => ['nullable', 'string', 'max:255'],
        'notes' => ['nullable', 'string', 'max:2000'],
    ]);

    $baseCode = Str::slug($validated['code'] ?? $validated['username'] ?? $validated['name']) ?: 'sirket';
    $code = $baseCode;
    $suffix = 2;

    while (DB::table('client_companies')->where('code', $code)->exists()) {
        $code = "{$baseCode}-{$suffix}";
        $suffix++;
    }

    $username = Str::slug($validated['username'] ?? $code);

    if (DB::table('client_companies')->where('username', $username)->exists()) {
        return response()->json(['message' => 'Bu kullanici adi zaten kullaniliyor.'], 422);
    }

    try {
        $id = DB::table('client_companies')->insertGetId([
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
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $company = DB::table('client_companies')->where('id', $id)->first();

        return response()->json(['company' => $serializeCompany($company)], 201);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Client company olusturma hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::put('/client-companies/{clientCompany}', function (string $clientCompany) use ($serializeCompany) {
    $validated = request()->validate([
        'name' => ['required', 'string', 'max:255'],
        'contactName' => ['nullable', 'string', 'max:255'],
        'phone' => ['nullable', 'string', 'max:255'],
        'email' => ['nullable', 'email', 'max:255'],
        'address' => ['nullable', 'string', 'max:255'],
        'taxNumber' => ['nullable', 'string', 'max:255'],
        'notes' => ['nullable', 'string', 'max:2000'],
        'active' => ['nullable', 'boolean'],
    ]);

    $company = DB::table('client_companies')->where('id', $clientCompany)->first();

    if (! $company) {
        return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
    }

    DB::table('client_companies')->where('id', $clientCompany)->update([
        'name' => $validated['name'],
        'contact_name' => $validated['contactName'] ?? null,
        'phone' => $validated['phone'] ?? null,
        'email' => $validated['email'] ?? null,
        'address' => $validated['address'] ?? null,
        'tax_number' => $validated['taxNumber'] ?? null,
        'notes' => $validated['notes'] ?? null,
        'active' => $validated['active'] ?? $company->active,
        'updated_at' => now(),
    ]);

    return response()->json(['company' => $serializeCompany(DB::table('client_companies')->where('id', $clientCompany)->first())]);
});

Route::delete('/client-companies/{clientCompany}', function (string $clientCompany) {
    DB::table('client_companies')->where('id', $clientCompany)->delete();

    return response()->json(['message' => 'Sirket uyeligi silindi.']);
});

Route::get('/client-companies/{companyCode}', function (string $companyCode) use ($serializeCompany) {
    $company = DB::table('client_companies')->where('code', Str::slug($companyCode))->first();

    if (! $company) {
        return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
    }

    return response()->json(['company' => $serializeCompany($company)]);
});

Route::get('/meal-requests', function () use ($serializeMealRequest) {
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
            ->map($serializeMealRequest);

        return response()->json(['requests' => $requests]);
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Meal requests hata: '.$exception->getMessage()], 500);
    }
});

Route::post('/meal-requests', function () use ($serializeMealRequest) {
    $validated = request()->validate([
        'companyCode' => ['required', 'string', 'max:120'],
        'serviceDate' => ['nullable', 'date_format:Y-m-d'],
        'headcount' => ['required', 'integer', 'min:1', 'max:100000'],
        'note' => ['nullable', 'string', 'max:2000'],
    ]);

    $company = DB::table('client_companies')
        ->where('code', Str::slug($validated['companyCode']))
        ->where('active', true)
        ->first();

    if (! $company) {
        return response()->json(['message' => 'Aktif sirket uyeligi bulunamadi.'], 404);
    }

    $serviceDate = $validated['serviceDate'] ?? now()->toDateString();

    try {
        $requestNo = DB::transaction(function () use ($company, $serviceDate, $validated) {
            $existing = DB::table('meal_requests')
                ->where('client_company_id', $company->id)
                ->whereDate('service_date', $serviceDate)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if ($existing->status !== 'submitted') {
                    throw ValidationException::withMessages([
                        'headcount' => 'Yemek yenildi onaylandiktan sonra kisi sayisi degistirilemez.',
                    ]);
                }

                DB::table('meal_requests')->where('id', $existing->id)->update([
                    'headcount' => $validated['headcount'],
                    'note' => $validated['note'] ?? null,
                    'updated_at' => now(),
                ]);

                return $existing->request_no;
            }

            $counter = DB::table('meal_request_counters')->where('key', 'meal_request')->lockForUpdate()->first();
            $nextValue = $counter ? (int) $counter->next_value : 1;

            if ($counter) {
                DB::table('meal_request_counters')->where('key', 'meal_request')->update(['next_value' => $nextValue + 1]);
            } else {
                DB::table('meal_request_counters')->insert(['key' => 'meal_request', 'next_value' => $nextValue + 1]);
            }

            $requestNo = 'Y'.str_pad((string) $nextValue, 4, '0', STR_PAD_LEFT);

            DB::table('meal_requests')->insert([
                'request_no' => $requestNo,
                'client_company_id' => $company->id,
                'service_date' => $serviceDate,
                'headcount' => $validated['headcount'],
                'status' => 'submitted',
                'note' => $validated['note'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $requestNo;
        });

        $mealRequest = DB::table('meal_requests')
            ->join('client_companies', 'client_companies.id', '=', 'meal_requests.client_company_id')
            ->select('meal_requests.*', 'client_companies.code as company_code', 'client_companies.name as company_name')
            ->where('meal_requests.request_no', $requestNo)
            ->first();

        return response()->json(['request' => $serializeMealRequest($mealRequest)], 201);
    } catch (ValidationException $exception) {
        throw $exception;
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Meal request olusturma hata: '.$exception->getMessage()], 500);
    }
});

Route::patch('/meal-requests/{requestNo}', function (string $requestNo) use ($serializeMealRequest) {
    $validated = request()->validate([
        'status' => ['required', Rule::in(['eaten', 'collected'])],
    ]);

    $mealRequest = DB::table('meal_requests')->where('request_no', $requestNo)->first();

    if (! $mealRequest) {
        return response()->json(['message' => 'Yemek talebi bulunamadi.'], 404);
    }

    $updates = ['status' => $validated['status'], 'updated_at' => now()];

    if ($validated['status'] === 'eaten') {
        $updates['eaten_at'] = $mealRequest->eaten_at ?? now();
    }

    if ($validated['status'] === 'collected') {
        $updates['eaten_at'] = $mealRequest->eaten_at ?? now();
        $updates['collected_at'] = now();
    }

    DB::table('meal_requests')->where('request_no', $requestNo)->update($updates);

    $mealRequest = DB::table('meal_requests')
        ->join('client_companies', 'client_companies.id', '=', 'meal_requests.client_company_id')
        ->select('meal_requests.*', 'client_companies.code as company_code', 'client_companies.name as company_name')
        ->where('meal_requests.request_no', $requestNo)
        ->first();

    return response()->json(['request' => $serializeMealRequest($mealRequest)]);
});
PHP;

$routesPath = $appPath.'/routes/api.php';

if (@file_put_contents($routesPath, $routes) === false) {
    $result['errors'][] = "Could not write routes file: {$routesPath}";
} else {
    @chmod($routesPath, 0644);
    $result['writtenFiles'][] = [
        'path' => $routesPath,
        'bytes' => filesize($routesPath),
        'md5' => md5_file($routesPath),
    ];
}

foreach (glob($appPath.'/bootstrap/cache/*.php') ?: [] as $cacheFile) {
    $name = basename($cacheFile);

    if (! in_array($name, ['packages.php', 'services.php'], true) && @unlink($cacheFile)) {
        $result['deletedCacheFiles'][] = $cacheFile;
    }
}

if (function_exists('opcache_reset')) {
    $result['opcacheReset'] = @opcache_reset();
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

