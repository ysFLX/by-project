<?php

use App\Http\Controllers\Api\ClientCompanyController;
use App\Http\Controllers\Api\CompanyPersonController;
use App\Http\Controllers\Api\MealRequestController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

if (! function_exists('makeAdminAccessToken')) {
    function makeAdminAccessToken(): string
    {
        return hash('sha256', (string) config('app.key').(string) env('ADMIN_PASSWORD', 'admin123'));
    }
}

if (! function_exists('requestHasValidAdminToken')) {
    function requestHasValidAdminToken($request): bool
    {
        $header = (string) $request->header('Authorization', '');

        if (strpos($header, 'Bearer ') === 0 && hash_equals(makeAdminAccessToken(), substr($header, 7))) {
            return true;
        }

        $cookieToken = (string) $request->cookie('maharet_admin_session', '');

        return $cookieToken !== '' && hash_equals(makeAdminAccessToken(), $cookieToken);
    }
}

if (! function_exists('ensureAccountRoleColumns')) {
    function ensureAccountRoleColumns(): void
    {
        if (! Schema::hasTable('client_companies')) {
            return;
        }

        if (! Schema::hasColumn('client_companies', 'role')) {
            Schema::table('client_companies', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->string('role')->default('customer');
            });
        }

        if (! Schema::hasColumn('client_companies', 'hidden')) {
            Schema::table('client_companies', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->boolean('hidden')->default(false);
            });
        }
    }
}

if (! function_exists('seedSystemAccounts')) {
    function seedSystemAccounts(): void
    {
        ensureAccountRoleColumns();

        if (! Schema::hasTable('client_companies')) {
            return;
        }

        $now = now();
        $accounts = [
            [
                'code' => 'admin',
                'username' => 'admin',
                'password' => (string) env('OWNER_PASSWORD', env('ADMIN_PASSWORD', 'admin123')),
                'name' => 'Admin',
                'role' => 'admin',
                'hidden' => true,
            ],
            [
                'code' => 'maharet-yemek',
                'username' => 'maharet-yemek',
                'password' => (string) env('CATERING_PASSWORD', 'maharet123'),
                'name' => 'Maharet Yemek',
                'role' => 'admin',
                'hidden' => false,
            ],
        ];

        foreach ($accounts as $account) {
            $existing = DB::table('client_companies')
                ->where(function ($query) use ($account) {
                    $query->where('username', $account['username'])->orWhere('code', $account['code']);
                })
                ->first();

            $attributes = [
                'code' => $account['code'],
                'username' => $account['username'],
                'name' => $account['name'],
                'contact_name' => $account['name'],
                'active' => true,
                'role' => $account['role'],
                'hidden' => $account['hidden'],
                'updated_at' => $now,
            ];

            $shouldResetSystemPassword = ! $existing
                || empty($existing->password_hash)
                || (string) ($existing->role ?? 'customer') !== $account['role'];

            if ($shouldResetSystemPassword) {
                $attributes['password_hash'] = Illuminate\Support\Facades\Hash::make($account['password']);
            }

            if (Schema::hasColumn('client_companies', 'account_type')) {
                $attributes['account_type'] = 'corporate';
            }

            if ($existing) {
                DB::table('client_companies')->where('id', $existing->id)->update($attributes);
            } else {
                $attributes['created_at'] = $now;
                DB::table('client_companies')->insert($attributes);
            }
        }
    }
}

if (! function_exists('ensureMenuDocumentsTable')) {
    function ensureMenuDocumentsTable(): void
    {
        if (! Schema::hasTable('menu_documents')) {
            Schema::create('menu_documents', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('month', 7)->index();
                $table->string('title');
                $table->string('file_name');
                $table->longText('file_data');
                $table->string('mime_type')->default('application/pdf');
                $table->unsignedBigInteger('size')->default(0);
                $table->timestamps();
            });

            return;
        }

        if (! Schema::hasColumn('menu_documents', 'file_data')) {
            Schema::table('menu_documents', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->longText('file_data')->nullable()->after('file_name');
            });
        }
    }
}

if (! function_exists('serializeMenuDocument')) {
    function serializeMenuDocument($menu): array
    {
        return [
            'id' => (string) $menu->id,
            'month' => $menu->month,
            'title' => $menu->title,
            'fileName' => $menu->file_name,
            'url' => request()->getSchemeAndHttpHost().'/backend/api/menus/'.$menu->id.'/pdf',
            'size' => (int) $menu->size,
            'createdAt' => $menu->created_at,
            'updatedAt' => $menu->updated_at,
        ];
    }
}

if (! function_exists('ensureMenuDaysTable')) {
    function ensureMenuDaysTable(): void
    {
        if (Schema::hasTable('menu_days')) {
            return;
        }

        Schema::create('menu_days', function (\Illuminate\Database\Schema\Blueprint $table) {
            $table->id();
            $table->date('service_date')->unique();
            $table->json('items');
            $table->unsignedInteger('calories')->nullable();
            $table->timestamps();
        });
    }
}

if (! function_exists('serializeMenuDay')) {
    function serializeMenuDay($menuDay): array
    {
        return [
            'date' => (string) $menuDay->service_date,
            'items' => json_decode($menuDay->items ?: '[]', true) ?: [],
            'calories' => $menuDay->calories !== null ? (int) $menuDay->calories : null,
            'updatedAt' => $menuDay->updated_at,
        ];
    }
}

if (! function_exists('decodePdfTextValue')) {
    function decodePdfTextValue(string $value): string
    {
        $value = preg_replace('/\\\\([nrtbf()\\\\])/', ' ', $value);
        $value = preg_replace('/\\\\[0-7]{1,3}/', ' ', $value);

        return trim((string) preg_replace('/\s+/u', ' ', $value));
    }
}

if (! function_exists('extractTextFromPdfBinary')) {
    function extractTextFromPdfBinary(string $binary): string
    {
        $textParts = [];

        if (preg_match_all('/<<(.*?)>>\s*stream\r?\n?(.*?)\r?\n?endstream/s', $binary, $streams, PREG_SET_ORDER)) {
            foreach ($streams as $stream) {
                $dictionary = $stream[1];
                $content = $stream[2];

                if (str_contains($dictionary, 'FlateDecode')) {
                    $inflated = @gzuncompress($content);
                    $content = $inflated !== false ? $inflated : $content;
                }

                if (preg_match_all('/\((?:\\\\.|[^\\\\)])*\)/s', $content, $matches)) {
                    foreach ($matches[0] as $match) {
                        $textParts[] = decodePdfTextValue(substr($match, 1, -1));
                    }
                }

                if (preg_match_all('/<([0-9A-Fa-f]{4,})>/', $content, $hexMatches)) {
                    foreach ($hexMatches[1] as $hex) {
                        $decoded = @hex2bin($hex);

                        if ($decoded !== false) {
                            $utf16 = function_exists('mb_convert_encoding') ? @mb_convert_encoding($decoded, 'UTF-8', 'UTF-16BE') : false;
                            $textParts[] = trim($utf16 ?: $decoded);
                        }
                    }
                }
            }
        }

        return trim(implode("\n", array_filter($textParts)));
    }
}

if (! function_exists('parseMenuDaysFromText')) {
    function parseMenuDaysFromText(string $text, string $month): array
    {
        $timestamp = strtotime($month.'-01');
        $dayCount = (int) date('t', $timestamp);
        $monthNumber = (int) date('n', $timestamp);
        $monthNames = [
            1 => 'ocak', 2 => 'subat|şubat', 3 => 'mart', 4 => 'nisan',
            5 => 'mayis|mayıs', 6 => 'haziran', 7 => 'temmuz', 8 => 'agustos|ağustos',
            9 => 'eylul|eylül', 10 => 'ekim', 11 => 'kasim|kasım', 12 => 'aralik|aralık',
        ];
        $weekDays = 'pazartesi|sali|salı|carsamba|çarşamba|persembe|perşembe|cuma|cumartesi';
        $normalizedText = str_replace(["\r", "\t"], ["\n", " "], $text);
        $markers = [];

        for ($day = 1; $day <= $dayCount; $day += 1) {
            $patterns = [
                '/\b0?'.$day.'[\.\/-]0?'.$monthNumber.'(?:[\.\/-]\d{2,4})?\b/ui',
                '/\b0?'.$day.'\s*(?:'.$monthNames[$monthNumber].')\b/ui',
                '/\b0?'.$day.'\s*(?:'.$weekDays.')\b/ui',
            ];

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $normalizedText, $match, PREG_OFFSET_CAPTURE)) {
                    $markers[] = ['day' => $day, 'offset' => $match[0][1], 'length' => strlen($match[0][0])];
                    break;
                }
            }
        }

        usort($markers, fn ($first, $second) => $first['offset'] <=> $second['offset']);
        $parsed = [];

        foreach ($markers as $index => $marker) {
            $start = $marker['offset'];
            $end = $markers[$index + 1]['offset'] ?? strlen($normalizedText);
            $chunk = trim(substr($normalizedText, $start, max(0, $end - $start)));
            $chunk = preg_replace('/\b0?'.$marker['day'].'(?:[\.\/-]0?'.$monthNumber.'(?:[\.\/-]\d{2,4})?|\s*(?:'.$monthNames[$monthNumber].')?|\s*(?:'.$weekDays.')?)\b/ui', ' ', $chunk, 1);
            $chunk = preg_replace('/\b(?:'.$weekDays.'|'.$monthNames[$monthNumber].')\b/ui', ' ', $chunk);
            $chunk = preg_replace('/\b\d{2,4}\s*kcal\b/ui', ' ', $chunk);

            $items = collect(preg_split('/\n|•|·|\s+-\s+|,\s*/u', (string) $chunk))
                ->map(fn ($item) => trim((string) preg_replace('/\s+/u', ' ', $item)))
                ->filter(fn ($item) => $item !== '' && mb_strlen($item) > 2 && ! preg_match('/^\d+$/', $item))
                ->take(6)
                ->values();

            if ($items->isNotEmpty()) {
                $parsed[] = [
                    'date' => $month.'-'.str_pad((string) $marker['day'], 2, '0', STR_PAD_LEFT),
                    'items' => $items->all(),
                    'calories' => null,
                ];
            }
        }

        return $parsed;
    }
}

Route::post('/auth/login', function () {
    try {
        seedSystemAccounts();

        $username = Str::slug((string) request('username'));
        $password = (string) request('password');

        request()->validate([
            'username' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $company = DB::table('client_companies')
            ->where(function ($query) use ($username) {
                $query->where('username', $username)->orWhere('code', $username);
            })
            ->where('active', true)
            ->first();

        if (! $company || ! ($company->password_hash ?? null) || ! Illuminate\Support\Facades\Hash::check($password, $company->password_hash)) {
            return response()->json(['message' => 'Kullanici adi veya sifre hatali.'], 422);
        }

        $accountRole = (string) ($company->role ?? 'customer');

        if ($accountRole === 'admin') {
            return response()->json([
                'user' => [
                    'username' => $company->username,
                    'role' => 'admin',
                    'accountRole' => $accountRole,
                    'displayName' => $company->name,
                ],
            ])->cookie(
                'maharet_admin_session',
                makeAdminAccessToken(),
                720,
                '/',
                null,
                request()->isSecure(),
                true,
                false,
                'Lax'
            );
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
        return response()->json([
            'message' => 'Login hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::post('/auth/logout', function () {
    return response()->json(['message' => 'Cikis yapildi.'])->cookie(
        'maharet_admin_session',
        '',
        -1,
        '/',
        null,
        request()->isSecure(),
        true,
        false,
        'Lax'
    );
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

Route::get('/menus', function () {
    try {
        ensureMenuDocumentsTable();

        $month = (string) request('month', now()->format('Y-m'));
        $menus = DB::table('menu_documents')
            ->where('month', $month)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($menu) => serializeMenuDocument($menu));

        return response()->json(['menus' => $menus]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Menu listesi hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::get('/menu-days', function () {
    try {
        ensureMenuDaysTable();

        $month = (string) request('month', now()->format('Y-m'));
        $menuDays = DB::table('menu_days')
            ->whereBetween('service_date', [$month.'-01', date('Y-m-t', strtotime($month.'-01'))])
            ->orderBy('service_date')
            ->get()
            ->map(fn ($menuDay) => serializeMenuDay($menuDay));

        return response()->json(['days' => $menuDays]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Menu gunleri hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::post('/menu-days', function () {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureMenuDaysTable();

        $validated = request()->validate([
            'month' => ['required', 'date_format:Y-m'],
            'days' => ['required', 'array'],
            'days.*.date' => ['required', 'date_format:Y-m-d'],
            'days.*.items' => ['nullable', 'array'],
            'days.*.items.*' => ['string', 'max:255'],
            'days.*.calories' => ['nullable', 'integer', 'min:0', 'max:10000'],
        ]);

        $month = $validated['month'];
        $now = now();

        DB::transaction(function () use ($validated, $month, $now) {
            foreach ($validated['days'] as $day) {
                if (strpos($day['date'], $month.'-') !== 0) {
                    continue;
                }

                $items = collect($day['items'] ?? [])
                    ->map(fn ($item) => trim((string) $item))
                    ->filter()
                    ->values();

                if ($items->isEmpty()) {
                    DB::table('menu_days')->where('service_date', $day['date'])->delete();
                    continue;
                }

                DB::table('menu_days')->updateOrInsert(
                    ['service_date' => $day['date']],
                    [
                        'items' => json_encode($items->all(), JSON_UNESCAPED_UNICODE),
                        'calories' => $day['calories'] ?? null,
                        'updated_at' => $now,
                        'created_at' => $now,
                    ]
                );
            }
        });

        $menuDays = DB::table('menu_days')
            ->whereBetween('service_date', [$month.'-01', date('Y-m-t', strtotime($month.'-01'))])
            ->orderBy('service_date')
            ->get()
            ->map(fn ($menuDay) => serializeMenuDay($menuDay));

        return response()->json(['days' => $menuDays]);
    } catch (\Illuminate\Validation\ValidationException $exception) {
        return response()->json([
            'message' => collect($exception->errors())->flatten()->first() ?? 'Menu gunleri gecersiz.',
            'errors' => $exception->errors(),
        ], 422);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Menu gunleri kaydetme hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::get('/menus/{menu}/pdf', function (string $menu) {
    try {
        ensureMenuDocumentsTable();

        $menuDocument = DB::table('menu_documents')->where('id', $menu)->first();

        if (! $menuDocument || ! ($menuDocument->file_data ?? null)) {
            return response()->json(['message' => 'Menu PDF bulunamadi.'], 404);
        }

        return response(base64_decode($menuDocument->file_data), 200, [
            'Content-Type' => $menuDocument->mime_type ?: 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$menuDocument->file_name.'"',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Menu PDF acma hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::post('/menus', function () {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

        try {
        ensureMenuDocumentsTable();
        ensureMenuDaysTable();

        $validated = request()->validate([
            'month' => ['required', 'date_format:Y-m'],
            'title' => ['nullable', 'string', 'max:255'],
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:20480'],
            'extractedText' => ['nullable', 'string'],
            'parsedDays' => ['nullable', 'string'],
        ]);

        $file = request()->file('pdf');

        if (! $file || ! $file->isValid()) {
            return response()->json(['message' => 'PDF dosyasi yuklenemedi.'], 422);
        }

        $storedName = $validated['month'].'-'.date('YmdHis').'-'.Str::random(8).'.pdf';
        $binary = file_get_contents($file->getRealPath());
        $fileData = base64_encode($binary);
        $extractedText = trim((string) ($validated['extractedText'] ?? ''));

        if ($extractedText === '') {
            $extractedText = extractTextFromPdfBinary($binary);
        }
        $parsedDays = [];
        $clientParsedDays = json_decode((string) ($validated['parsedDays'] ?? ''), true);

        if (is_array($clientParsedDays)) {
            $parsedDays = collect($clientParsedDays)
                ->map(function ($day) use ($validated) {
                    $date = (string) ($day['date'] ?? '');

                    if (! preg_match('/^'.preg_quote($validated['month'], '/').'-\d{2}$/', $date)) {
                        return null;
                    }

                    $items = collect($day['items'] ?? [])
                        ->map(fn ($item) => trim((string) $item))
                        ->filter()
                        ->values();

                    if ($items->isEmpty()) {
                        return null;
                    }

                    return [
                        'date' => $date,
                        'items' => $items->all(),
                        'calories' => null,
                    ];
                })
                ->filter()
                ->values()
                ->all();
        }

        if (count($parsedDays) === 0) {
            $parsedDays = parseMenuDaysFromText($extractedText, $validated['month']);
        }

        if (count($parsedDays) === 0) {
            return response()->json([
                'message' => 'PDF icinden gunluk yemek tablosu okunamadi. PDF metin secilebilir olmali veya tarih satirlari gun/ay seklinde yazmali.',
            ], 422);
        }

        $now = now();
        $attributes = [
            'month' => $validated['month'],
            'title' => $validated['title'] ?: $validated['month'].' aylik yemek menusu',
            'file_name' => $storedName,
            'file_data' => $fileData,
            'mime_type' => 'application/pdf',
            'size' => $file->getSize() ?: 0,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        if (Schema::hasColumn('menu_documents', 'file_path')) {
            $attributes['file_path'] = '';
        }

        $id = DB::table('menu_documents')->insertGetId($attributes);

        DB::transaction(function () use ($parsedDays, $validated, $now) {
            DB::table('menu_days')
                ->whereBetween('service_date', [$validated['month'].'-01', date('Y-m-t', strtotime($validated['month'].'-01'))])
                ->delete();

            foreach ($parsedDays as $day) {
                DB::table('menu_days')->updateOrInsert(
                    ['service_date' => $day['date']],
                    [
                        'items' => json_encode($day['items'], JSON_UNESCAPED_UNICODE),
                        'calories' => $day['calories'],
                        'updated_at' => $now,
                        'created_at' => $now,
                    ]
                );
            }
        });

        $menu = DB::table('menu_documents')->where('id', $id)->first();
        $menuDays = collect($parsedDays)->map(fn ($day) => [
            'date' => $day['date'],
            'items' => $day['items'],
            'calories' => $day['calories'],
            'updatedAt' => $now,
        ]);

        return response()->json([
            'menu' => serializeMenuDocument($menu),
            'days' => $menuDays,
        ], 201);
    } catch (\Illuminate\Validation\ValidationException $exception) {
        return response()->json([
            'message' => collect($exception->errors())->flatten()->first() ?? 'Menu PDF bilgileri gecersiz.',
            'errors' => $exception->errors(),
        ], 422);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Menu PDF yukleme hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::delete('/menus/{menu}', function (string $menu) {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureMenuDocumentsTable();

        $menuDocument = DB::table('menu_documents')->where('id', $menu)->first();

        if (! $menuDocument) {
            return response()->json(['message' => 'Menu PDF bulunamadi.'], 404);
        }

        DB::table('menu_documents')->where('id', $menu)->delete();

        return response()->json(['message' => 'Menu PDF silindi.']);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Menu PDF silme hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::get('/debug/schema', function () {
    $tables = ['client_companies', 'company_people', 'meal_requests', 'meal_request_counters', 'meal_request_people'];

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
        if (! requestHasValidAdminToken(request())) {
            return response()->json(['message' => 'Admin girisi gerekli.'], 401);
        }

        try {
            seedSystemAccounts();

            $companies = DB::table('client_companies')
                ->where(function ($query) {
                    $query->whereNull('role')->orWhere('role', 'customer');
                })
                ->where(function ($query) {
                    $query->whereNull('hidden')->orWhere('hidden', false);
                })
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
Route::post('/client-companies', function () {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAccountRoleColumns();

        $validated = request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'accountType' => ['nullable', 'string', 'in:individual,corporate'],
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

        $baseCode = Str::slug($validated['code'] ?? $validated['username'] ?? $validated['name']);
        $code = $baseCode ?: 'sirket';
        $username = Str::slug($validated['username'] ?? $code);

        if (DB::table('client_companies')->where('code', $code)->exists()) {
            return response()->json(['message' => 'Bu uyelik kodu zaten kullaniliyor.'], 422);
        }

        if (DB::table('client_companies')->where('username', $username)->exists()) {
            return response()->json(['message' => 'Bu kullanici adi zaten kullaniliyor.'], 422);
        }

        $now = now();
        $attributes = [
            'code' => $code,
            'username' => $username,
            'password_hash' => password_hash($validated['password'] ?? Str::random(10), PASSWORD_BCRYPT),
            'name' => $validated['name'],
            'contact_name' => $validated['contactName'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'tax_number' => $validated['taxNumber'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        if (Schema::hasColumn('client_companies', 'account_type')) {
            $attributes['account_type'] = $validated['accountType'] ?? 'corporate';
        }

        if (Schema::hasColumn('client_companies', 'role')) {
            $attributes['role'] = 'customer';
        }

        if (Schema::hasColumn('client_companies', 'hidden')) {
            $attributes['hidden'] = false;
        }

        $id = DB::table('client_companies')->insertGetId($attributes);
        $company = DB::table('client_companies')->where('id', $id)->first();

        return response()->json([
            'company' => [
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
            ],
        ], 201);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Client company olusturma hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});
Route::put('/client-companies/{clientCompany}', function (string $clientCompany) {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAccountRoleColumns();

        $company = DB::table('client_companies')->where('id', $clientCompany)->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        if (($company->role ?? 'customer') !== 'customer' || (bool) ($company->hidden ?? false)) {
            return response()->json(['message' => 'Bu hesap musteri uyeligi olarak duzenlenemez.'], 403);
        }

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

        $updates = [
            'name' => $validated['name'],
            'contact_name' => $validated['contactName'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'active' => $validated['active'] ?? (bool) $company->active,
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('client_companies', 'tax_number')) {
            $updates['tax_number'] = $validated['taxNumber'] ?? null;
        }

        if (Schema::hasColumn('client_companies', 'notes')) {
            $updates['notes'] = $validated['notes'] ?? null;
        }

        DB::table('client_companies')->where('id', $clientCompany)->update($updates);
        $updatedCompany = DB::table('client_companies')->where('id', $clientCompany)->first();

        return response()->json([
            'company' => [
                'id' => (string) $updatedCompany->id,
                'code' => $updatedCompany->code,
                'username' => $updatedCompany->username,
                'accountType' => $updatedCompany->account_type ?? 'corporate',
                'name' => $updatedCompany->name,
                'contactName' => $updatedCompany->contact_name,
                'phone' => $updatedCompany->phone,
                'email' => $updatedCompany->email,
                'address' => $updatedCompany->address,
                'taxNumber' => $updatedCompany->tax_number ?? null,
                'notes' => $updatedCompany->notes ?? null,
                'active' => (bool) $updatedCompany->active,
                'createdAt' => $updatedCompany->created_at,
                'updatedAt' => $updatedCompany->updated_at,
            ],
        ]);
    } catch (\Illuminate\Validation\ValidationException $exception) {
        return response()->json([
            'message' => collect($exception->errors())->flatten()->first() ?? 'Sirket bilgileri gecersiz.',
            'errors' => $exception->errors(),
        ], 422);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Sirket guncelleme hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});
Route::delete('/client-companies/{clientCompany}', function (string $clientCompany) {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        $company = DB::table('client_companies')->where('id', $clientCompany)->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        if (($company->role ?? 'customer') !== 'customer' || (bool) ($company->hidden ?? false)) {
            return response()->json(['message' => 'Bu hesap musteri uyeligi olarak silinemez.'], 403);
        }

        DB::transaction(function () use ($clientCompany) {
            $mealRequestIds = DB::table('meal_requests')
                ->where('client_company_id', $clientCompany)
                ->pluck('id');

            if ($mealRequestIds->isNotEmpty()) {
                DB::table('meal_request_people')
                    ->whereIn('meal_request_id', $mealRequestIds)
                    ->delete();
            }

            DB::table('meal_requests')
                ->where('client_company_id', $clientCompany)
                ->delete();

            DB::table('company_people')
                ->where('client_company_id', $clientCompany)
                ->delete();

            DB::table('client_companies')
                ->where('id', $clientCompany)
                ->delete();
        });

        return response()->json(['message' => 'Sirket uyeligi ve bagli kayitlari silindi.']);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Sirket silme hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});
Route::get('/client-companies/{companyCode}/people', function (string $companyCode) {
    try {
        ensureAccountRoleColumns();

        $company = DB::table('client_companies')
            ->where(function ($query) use ($companyCode) {
                $slug = Str::slug($companyCode);

                $query->where('code', $slug)->orWhere('username', $slug);
            })
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('hidden')->orWhere('hidden', false);
            })
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        $people = DB::table('company_people')
            ->where('client_company_id', $company->id)
            ->orderByDesc('active')
            ->orderBy('name')
            ->get()
            ->map(fn ($person) => [
                'id' => (string) $person->id,
                'companyId' => (string) $person->client_company_id,
                'name' => $person->name,
                'department' => $person->department,
                'employeeCode' => $person->employee_code,
                'notes' => $person->notes,
                'active' => (bool) $person->active,
                'createdAt' => $person->created_at,
                'updatedAt' => $person->updated_at,
            ]);

        return response()->json(['people' => $people]);
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Kisi listesi hata: '.$exception->getMessage()], 500);
    }
});
Route::post('/client-companies/{companyCode}/people', function (string $companyCode) {
    try {
        ensureAccountRoleColumns();

        $company = DB::table('client_companies')
            ->where(function ($query) use ($companyCode) {
                $slug = Str::slug($companyCode);

                $query->where('code', $slug)->orWhere('username', $slug);
            })
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('hidden')->orWhere('hidden', false);
            })
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        $validated = request()->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $id = DB::table('company_people')->insertGetId([
            'client_company_id' => $company->id,
            'name' => $validated['name'],
            'department' => null,
            'employee_code' => null,
            'notes' => null,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $person = DB::table('company_people')->where('id', $id)->first();

        return response()->json([
            'person' => [
                'id' => (string) $person->id,
                'companyId' => (string) $person->client_company_id,
                'name' => $person->name,
                'department' => $person->department,
                'employeeCode' => $person->employee_code,
                'notes' => $person->notes,
                'active' => (bool) $person->active,
                'createdAt' => $person->created_at,
                'updatedAt' => $person->updated_at,
            ],
        ], 201);
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Kisi ekleme hata: '.$exception->getMessage()], 500);
    }
});
Route::patch('/client-companies/{companyCode}/people/{person}', function (string $companyCode, string $person) {
    try {
        ensureAccountRoleColumns();

        $company = DB::table('client_companies')
            ->where(function ($query) use ($companyCode) {
                $slug = Str::slug($companyCode);

                $query->where('code', $slug)->orWhere('username', $slug);
            })
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('hidden')->orWhere('hidden', false);
            })
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        $validated = request()->validate([
            'active' => ['required', 'boolean'],
        ]);

        $updated = DB::table('company_people')
            ->where('id', $person)
            ->where('client_company_id', $company->id)
            ->update([
                'active' => $validated['active'],
                'updated_at' => now(),
            ]);

        if (! $updated) {
            return response()->json(['message' => 'Kisi bulunamadi.'], 404);
        }

        $personRecord = DB::table('company_people')->where('id', $person)->first();

        return response()->json([
            'person' => [
                'id' => (string) $personRecord->id,
                'companyId' => (string) $personRecord->client_company_id,
                'name' => $personRecord->name,
                'department' => $personRecord->department,
                'employeeCode' => $personRecord->employee_code,
                'notes' => $personRecord->notes,
                'active' => (bool) $personRecord->active,
                'createdAt' => $personRecord->created_at,
                'updatedAt' => $personRecord->updated_at,
            ],
        ]);
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Kisi guncelleme hata: '.$exception->getMessage()], 500);
    }
});
Route::delete('/client-companies/{companyCode}/people/{person}', function (string $companyCode, string $person) {
    try {
        ensureAccountRoleColumns();

        $company = DB::table('client_companies')
            ->where(function ($query) use ($companyCode) {
                $slug = Str::slug($companyCode);

                $query->where('code', $slug)->orWhere('username', $slug);
            })
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('hidden')->orWhere('hidden', false);
            })
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        $updated = DB::table('company_people')
            ->where('id', $person)
            ->where('client_company_id', $company->id)
            ->update([
                'active' => false,
                'updated_at' => now(),
            ]);

        if (! $updated) {
            return response()->json(['message' => 'Kisi bulunamadi.'], 404);
        }

        return response()->json(['message' => 'Kisi pasife alindi.']);
    } catch (Throwable $exception) {
        return response()->json(['message' => 'Kisi silme hata: '.$exception->getMessage()], 500);
    }
});
Route::get('/client-companies/{companyCode}', function (string $companyCode) {
    try {
        ensureAccountRoleColumns();

        $slug = Str::slug($companyCode);
        $company = DB::table('client_companies')
            ->where(function ($query) use ($slug) {
                $query->where('code', $slug)->orWhere('username', $slug);
            })
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('hidden')->orWhere('hidden', false);
            })
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Sirket uyeligi bulunamadi.'], 404);
        }

        return response()->json([
            'company' => [
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
            ],
        ]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Sirket uyeligi sorgu hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});

Route::get('/meal-requests', function () {
    try {
        $serviceDate = request()->query('serviceDate', now()->toDateString());
        $companyCode = request()->query('companyCode');

        if (! $companyCode && ! requestHasValidAdminToken(request())) {
            return response()->json(['message' => 'Admin girisi gerekli.'], 401);
        }

        $requests = DB::table('meal_requests')
            ->join('client_companies', 'client_companies.id', '=', 'meal_requests.client_company_id')
            ->select([
                'meal_requests.request_no',
                'meal_requests.id',
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
            ->map(function ($mealRequest) {
                $people = DB::table('meal_request_people')
                    ->join('company_people', 'company_people.id', '=', 'meal_request_people.company_person_id')
                    ->where('meal_request_people.meal_request_id', $mealRequest->id)
                    ->orderBy('company_people.name')
                    ->get()
                    ->map(fn ($person) => [
                        'id' => (string) $person->id,
                        'name' => $person->name,
                        'department' => $person->department,
                        'employeeCode' => $person->employee_code,
                    ]);

                return [
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
                    'people' => $people,
                ];
            });

        return response()->json(['requests' => $requests]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Meal requests hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});
Route::post('/meal-requests', function () {
    try {
        $validated = request()->validate([
            'companyCode' => ['required', 'string', 'max:120'],
            'serviceDate' => ['nullable', 'date_format:Y-m-d'],
            'headcount' => ['required', 'integer', 'min:0', 'max:100000'],
            'personIds' => ['nullable', 'array'],
            'personIds.*' => ['integer'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $company = DB::table('client_companies')
            ->where('code', Str::slug($validated['companyCode']))
            ->where('active', true)
            ->first();

        if (! $company) {
            return response()->json(['message' => 'Aktif sirket uyeligi bulunamadi.'], 404);
        }

        $personIds = collect($validated['personIds'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($personIds->isNotEmpty()) {
            $validPersonCount = DB::table('company_people')
                ->where('client_company_id', $company->id)
                ->where('active', true)
                ->whereIn('id', $personIds)
                ->count();

            if ($validPersonCount !== $personIds->count()) {
                return response()->json(['message' => 'Secilen kisiler bu sirkete ait degil veya pasif.'], 422);
            }
        }

        $serviceDate = $validated['serviceDate'] ?? now()->toDateString();
        $headcount = $personIds->isNotEmpty() ? $personIds->count() : (int) $validated['headcount'];
        $nowIstanbul = now('Europe/Istanbul');
        $existingForCutoff = DB::table('meal_requests')
            ->where('client_company_id', $company->id)
            ->whereDate('service_date', $serviceDate)
            ->first();

        if ($existingForCutoff && $existingForCutoff->status !== 'submitted') {
            return response()->json(['message' => 'Yemek yenildi onayindan sonra kisi sayisi degistirilemez.'], 422);
        }

        if (
            $existingForCutoff
            && $existingForCutoff->status === 'submitted'
            && (
                $serviceDate < $nowIstanbul->toDateString()
                || ($serviceDate === $nowIstanbul->toDateString() && $nowIstanbul->format('H:i') >= '09:00')
            )
        ) {
            return response()->json(['message' => "Saat 09:00'dan sonra bugunun yemek adedi guncellenemez."], 422);
        }

        $requestNo = DB::transaction(function () use ($company, $serviceDate, $validated, $headcount, $personIds) {
            $existing = DB::table('meal_requests')
                ->where('client_company_id', $company->id)
                ->whereDate('service_date', $serviceDate)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if ($existing->status !== 'submitted') {
                    return $existing->request_no;
                }

                DB::table('meal_requests')->where('id', $existing->id)->update([
                    'headcount' => $headcount,
                    'note' => $validated['note'] ?? null,
                    'updated_at' => now(),
                ]);

                DB::table('meal_request_people')->where('meal_request_id', $existing->id)->delete();

                foreach ($personIds as $personId) {
                    DB::table('meal_request_people')->insert([
                        'meal_request_id' => $existing->id,
                        'company_person_id' => $personId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return $existing->request_no;
            }

            $counter = DB::table('meal_request_counters')
                ->where('key', 'meal_request')
                ->lockForUpdate()
                ->first();
            $nextValue = $counter ? (int) $counter->next_value : 1;

            if ($counter) {
                DB::table('meal_request_counters')
                    ->where('key', 'meal_request')
                    ->update(['next_value' => $nextValue + 1]);
            } else {
                DB::table('meal_request_counters')->insert([
                    'key' => 'meal_request',
                    'next_value' => $nextValue + 1,
                ]);
            }

            $requestNo = 'Y'.str_pad((string) $nextValue, 4, '0', STR_PAD_LEFT);
            $mealRequestId = DB::table('meal_requests')->insertGetId([
                'request_no' => $requestNo,
                'client_company_id' => $company->id,
                'service_date' => $serviceDate,
                'headcount' => $headcount,
                'status' => 'submitted',
                'note' => $validated['note'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($personIds as $personId) {
                DB::table('meal_request_people')->insert([
                    'meal_request_id' => $mealRequestId,
                    'company_person_id' => $personId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $requestNo;
        });

        $mealRequest = DB::table('meal_requests')
            ->join('client_companies', 'client_companies.id', '=', 'meal_requests.client_company_id')
            ->select([
                'meal_requests.id',
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
            ->where('meal_requests.request_no', $requestNo)
            ->first();

        $people = DB::table('meal_request_people')
            ->join('company_people', 'company_people.id', '=', 'meal_request_people.company_person_id')
            ->where('meal_request_people.meal_request_id', $mealRequest->id)
            ->orderBy('company_people.name')
            ->get()
            ->map(fn ($person) => [
                'id' => (string) $person->id,
                'name' => $person->name,
                'department' => $person->department,
                'employeeCode' => $person->employee_code,
            ]);

        return response()->json([
            'request' => [
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
                'people' => $people,
            ],
        ], 201);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Meal request olusturma hata: '.$exception->getMessage(),
            'type' => $exception::class,
        ], 500);
    }
});
Route::patch('/meal-requests/{requestNo}', [MealRequestController::class, 'updateStatus']);
