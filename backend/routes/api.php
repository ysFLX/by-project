<?php

use App\Http\Controllers\Api\ClientCompanyController;
use App\Http\Controllers\Api\CompanyPersonController;
use App\Http\Controllers\Api\MealRequestController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

if (! function_exists('makeSignedSessionToken')) {
    function makeSignedSessionToken(array $claims, int $minutes = 720): string
    {
        $claims['exp'] = now()->addMinutes($minutes)->timestamp;
        $payload = rtrim(strtr(base64_encode(json_encode($claims, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $payload, (string) config('app.key'));

        return $payload.'.'.$signature;
    }
}

if (! function_exists('readSignedSessionToken')) {
    function readSignedSessionToken(?string $token): ?array
    {
        if (! $token || ! str_contains($token, '.')) {
            return null;
        }

        [$payload, $signature] = explode('.', $token, 2);
        $expectedSignature = hash_hmac('sha256', $payload, (string) config('app.key'));

        if (! hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $decoded = base64_decode(strtr($payload, '-_', '+/'), true);
        $claims = $decoded ? json_decode($decoded, true) : null;

        if (! is_array($claims) || (int) ($claims['exp'] ?? 0) < now()->timestamp) {
            return null;
        }

        return $claims;
    }
}

if (! function_exists('makeSessionCookie')) {
    function makeSessionCookie(string $name, string $value, int $minutes = 720)
    {
        return cookie($name, $value, $minutes, '/', null, request()->isSecure(), true, false, 'Lax');
    }
}

if (! function_exists('forgetSessionCookie')) {
    function forgetSessionCookie(string $name)
    {
        return cookie($name, '', -1, '/', null, request()->isSecure(), true, false, 'Lax');
    }
}

if (! function_exists('requestHasValidAdminToken')) {
    function requestHasValidAdminToken($request): bool
    {
        $claims = readSignedSessionToken((string) $request->cookie('maharet_admin_session', ''));

        return is_array($claims) && ($claims['role'] ?? null) === 'admin';
    }
}

if (! function_exists('authenticatedCompanyForRequest')) {
    function authenticatedCompanyForRequest($request, ?string $companyCode = null)
    {
        $claims = readSignedSessionToken((string) $request->cookie('maharet_company_session', ''));

        if (! is_array($claims) || ($claims['role'] ?? null) !== 'customer' || empty($claims['companyId'])) {
            return null;
        }

        $company = DB::table('client_companies')
            ->where('id', (int) $claims['companyId'])
            ->where('active', true)
            ->first();

        if (! $company || ($company->role ?? 'customer') !== 'customer' || (bool) ($company->hidden ?? false)) {
            return null;
        }

        if ((string) ($claims['passwordHash'] ?? '') !== hash('sha256', (string) ($company->password_hash ?? ''))) {
            return null;
        }

        if ($companyCode !== null) {
            $slug = Str::slug($companyCode);

            if ($slug !== (string) $company->code && $slug !== (string) $company->username) {
                return null;
            }
        }

        return $company;
    }
}

if (! function_exists('ensureAccountColumns')) {
    function ensureAccountColumns(): void
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

        if (! Schema::hasColumn('client_companies', 'meal_unit_price')) {
            Schema::table('client_companies', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->decimal('meal_unit_price', 10, 2)->default(170);
            });
        }

        if (! Schema::hasColumn('client_companies', 'meal_vat_enabled')) {
            Schema::table('client_companies', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->boolean('meal_vat_enabled')->default(false);
            });
        }
    }
}

if (! function_exists('seedSystemAccounts')) {
    function seedSystemAccounts(): void
    {
        ensureAccountColumns();

        if (! Schema::hasTable('client_companies')) {
            return;
        }

        $now = now();
        $accounts = [
            [
                'code' => 'admin',
                'username' => 'admin',
                'password' => (string) env('OWNER_PASSWORD', ''),
                'name' => 'Admin',
                'role' => 'admin',
                'hidden' => true,
            ],
            [
                'code' => 'maharet-yemek',
                'username' => 'maharet-yemek',
                'password' => (string) env('CATERING_PASSWORD', ''),
                'name' => 'Maharet Yemek',
                'role' => 'admin',
                'hidden' => false,
            ],
        ];

        foreach ($accounts as $account) {
            if ($account['password'] === '') {
                continue;
            }

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

if (! function_exists('cleanupMenuStorage')) {
    function cleanupMenuStorage(string $activeMonth, bool $replaceActiveMonthDocument = false): void
    {
        ensureMenuDaysTable();
        ensureMenuDocumentsTable();

        DB::table('menu_days')
            ->whereNotBetween('service_date', [$activeMonth.'-01', date('Y-m-t', strtotime($activeMonth.'-01'))])
            ->delete();

        DB::table('menu_documents')
            ->where('month', '<>', $activeMonth)
            ->delete();

        if ($replaceActiveMonthDocument) {
            DB::table('menu_documents')
                ->where('month', $activeMonth)
                ->delete();
        }
    }
}

if (! function_exists('ensureCompanyPaymentsTable')) {
    function ensureCompanyPaymentsTable(): void
    {
        if (! Schema::hasTable('company_payments')) {
            Schema::create('company_payments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('client_company_id');
                $table->string('month', 7);
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();
                $table->unique(['client_company_id', 'month'], 'company_payments_company_month_unique');
                $table->index('month');
            });
        }
    }
}

if (! function_exists('ensureAppNotificationsTable')) {
    function ensureAppNotificationsTable(): void
    {
        if (! Schema::hasTable('app_notifications')) {
            Schema::create('app_notifications', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('client_company_id')->nullable();
                $table->string('audience')->default('company');
                $table->string('type')->default('general');
                $table->date('service_date')->nullable();
                $table->string('title');
                $table->text('message');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
                $table->unique(['client_company_id', 'type', 'service_date'], 'app_notifications_company_type_date_unique');
                $table->index(['audience', 'read_at']);
                $table->index('service_date');
            });

            return;
        }

        if (! Schema::hasColumn('app_notifications', 'read_at')) {
            Schema::table('app_notifications', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->timestamp('read_at')->nullable()->after('message');
            });
        }

        if (! Schema::hasColumn('app_notifications', 'admin_cleared_at')) {
            Schema::table('app_notifications', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->timestamp('admin_cleared_at')->nullable()->after('read_at');
            });
        }
    }
}

if (! function_exists('serializeAppNotification')) {
    function serializeAppNotification($notification): array
    {
        return [
            'id' => (string) $notification->id,
            'companyId' => $notification->client_company_id ? (string) $notification->client_company_id : null,
            'companyName' => $notification->company_name ?? null,
            'companyCode' => $notification->company_code ?? null,
            'audience' => $notification->audience,
            'type' => $notification->type,
            'serviceDate' => $notification->service_date,
            'title' => $notification->title,
            'message' => $notification->message,
            'readAt' => $notification->read_at,
            'adminClearedAt' => $notification->admin_cleared_at ?? null,
            'createdAt' => $notification->created_at,
            'updatedAt' => $notification->updated_at,
        ];
    }
}

if (! function_exists('cleanupOldAppNotifications')) {
    function cleanupOldAppNotifications(): void
    {
        ensureAppNotificationsTable();
        $settings = getOperationalSettings();
        $retentionHours = max(1, min(720, (int) ($settings['notificationRetentionHours'] ?? 24)));

        DB::table('app_notifications')
            ->where('created_at', '<', now()->subHours($retentionHours))
            ->delete();
    }
}

if (! function_exists('getCompaniesMissingMealRequest')) {
    function getCompaniesMissingMealRequest(string $serviceDate)
    {
        ensureAccountColumns();

        $reportedCompanyIds = DB::table('meal_requests')
            ->whereDate('service_date', $serviceDate)
            ->pluck('client_company_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return DB::table('client_companies')
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('hidden')->orWhere('hidden', false);
            })
            ->when(count($reportedCompanyIds) > 0, fn ($query) => $query->whereNotIn('id', $reportedCompanyIds))
            ->orderBy('name')
            ->get();
    }
}

if (! function_exists('getCompaniesMissingMealEatenNotification')) {
    function getCompaniesMissingMealEatenNotification(string $serviceDate)
    {
        ensureAccountColumns();

        return DB::table('client_companies')
            ->leftJoin('meal_requests', function ($join) use ($serviceDate) {
                $join->on('meal_requests.client_company_id', '=', 'client_companies.id')
                    ->whereDate('meal_requests.service_date', $serviceDate);
            })
            ->where('client_companies.active', true)
            ->where(function ($query) {
                $query->whereNull('client_companies.role')->orWhere('client_companies.role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('client_companies.hidden')->orWhere('client_companies.hidden', false);
            })
            ->where(function ($query) {
                $query->whereNull('meal_requests.id')->orWhere('meal_requests.status', 'submitted');
            })
            ->select('client_companies.*')
            ->orderBy('client_companies.name')
            ->get();
    }
}

if (! function_exists('ensureOperationalSettingsTable')) {
    function ensureOperationalSettingsTable(): void
    {
        if (! Schema::hasTable('app_settings')) {
            Schema::create('app_settings', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->string('key')->primary();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }

        $now = now();
        $defaults = [
            'meal_eaten_deadline' => '16:30',
            'meal_collected_deadline' => '18:00',
            'notification_retention_hours' => '24',
        ];

        foreach ($defaults as $key => $value) {
            if (! DB::table('app_settings')->where('key', $key)->exists()) {
                DB::table('app_settings')->insert([
                    'key' => $key,
                    'value' => $value,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
}

if (! function_exists('getOperationalSettings')) {
    function getOperationalSettings(): array
    {
        ensureOperationalSettingsTable();

        $values = DB::table('app_settings')
            ->whereIn('key', ['meal_eaten_deadline', 'meal_collected_deadline', 'notification_retention_hours'])
            ->pluck('value', 'key');

        return [
            'eatenDeadline' => (string) ($values['meal_eaten_deadline'] ?? '16:30'),
            'collectedDeadline' => (string) ($values['meal_collected_deadline'] ?? '18:00'),
            'notificationRetentionHours' => (int) ($values['notification_retention_hours'] ?? 24),
        ];
    }
}

if (! function_exists('isValidOperationalTime')) {
    function isValidOperationalTime(string $value): bool
    {
        return (bool) preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $value);
    }
}

if (! function_exists('applyMealStatusAutomation')) {
    function applyMealStatusAutomation(): void
    {
        $settings = getOperationalSettings();
        $nowIstanbul = now('Europe/Istanbul');
        $today = $nowIstanbul->toDateString();
        $time = $nowIstanbul->format('H:i');

        if ($time >= $settings['eatenDeadline']) {
            DB::table('meal_requests')
                ->whereDate('service_date', $today)
                ->where('status', 'submitted')
                ->where('headcount', '>', 0)
                ->update([
                    'status' => 'eaten',
                    'eaten_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        if ($time >= $settings['collectedDeadline']) {
            DB::table('meal_requests')
                ->whereDate('service_date', $today)
                ->where('status', 'eaten')
                ->update([
                    'status' => 'collected',
                    'collected_at' => now(),
                    'updated_at' => now(),
                ]);
        }
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
            ])->cookie(makeSessionCookie('maharet_admin_session', makeSignedSessionToken([
                'role' => 'admin',
                'username' => $company->username,
            ])));
        }

        return response()->json([
            'user' => [
                'username' => $company->username,
                'role' => 'customer',
                'companyCode' => $company->code,
                'displayName' => $company->name,
            ],
        ])->cookie(makeSessionCookie('maharet_company_session', makeSignedSessionToken([
            'role' => 'customer',
            'companyId' => (int) $company->id,
            'username' => $company->username,
            'passwordHash' => hash('sha256', (string) $company->password_hash),
        ])));
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Login hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
})->middleware('throttle:10,1');

Route::post('/auth/logout', function () {
    return response()->json(['message' => 'Cikis yapildi.'])
        ->cookie(forgetSessionCookie('maharet_admin_session'))
        ->cookie(forgetSessionCookie('maharet_company_session'));
});

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
    } catch (Throwable $exception) {
        return response()->json([
            'status' => 'error',
            'app' => config('app.name'),
            'message' => (config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'time' => now()->toISOString(),
        ], 503);
    }

    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'time' => now()->toISOString(),
    ]);
});

Route::get('/operation-settings', function () {
    try {
        return response()->json(['settings' => getOperationalSettings()]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Operasyon ayarlari okunamadi: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::put('/operation-settings', function () {
    try {
        if (! requestHasValidAdminToken(request())) {
            return response()->json(['message' => 'Admin girisi gerekli.'], 401);
        }

        $validated = request()->validate([
            'eatenDeadline' => ['required', 'string'],
            'collectedDeadline' => ['required', 'string'],
            'notificationRetentionHours' => ['nullable', 'integer', 'min:1', 'max:720'],
        ]);

        $eatenDeadline = (string) $validated['eatenDeadline'];
        $collectedDeadline = (string) $validated['collectedDeadline'];

        if (! isValidOperationalTime($eatenDeadline) || ! isValidOperationalTime($collectedDeadline)) {
            return response()->json(['message' => 'Saatler HH:MM formatinda olmali.'], 422);
        }

        if ($collectedDeadline <= $eatenDeadline) {
            return response()->json(['message' => 'Toplandi saati, yemek yenildi saatinden sonra olmali.'], 422);
        }

        ensureOperationalSettingsTable();
        $now = now();

        foreach ([
            'meal_eaten_deadline' => $eatenDeadline,
            'meal_collected_deadline' => $collectedDeadline,
            'notification_retention_hours' => (string) ($validated['notificationRetentionHours'] ?? 24),
        ] as $key => $value) {
            DB::table('app_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'updated_at' => $now, 'created_at' => $now]
            );
        }

        applyMealStatusAutomation();

        return response()->json(['settings' => getOperationalSettings()]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Operasyon ayarlari kaydedilemedi: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::get('/report-payments', function () {
    try {
        if (! requestHasValidAdminToken(request())) {
            return response()->json(['message' => 'Admin girisi gerekli.'], 401);
        }

        ensureCompanyPaymentsTable();
        $month = (string) request('month', now()->format('Y-m'));

        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            return response()->json(['message' => 'Ay bilgisi YYYY-MM formatinda olmali.'], 422);
        }

        $payments = DB::table('company_payments')
            ->where('month', $month)
            ->get()
            ->map(fn ($payment) => [
                'companyId' => (string) $payment->client_company_id,
                'month' => $payment->month,
                'paid' => $payment->paid_at !== null,
                'paidAt' => $payment->paid_at,
            ]);

        return response()->json(['payments' => $payments]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Odeme kayitlari okunamadi: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::put('/report-payments', function () {
    try {
        if (! requestHasValidAdminToken(request())) {
            return response()->json(['message' => 'Admin girisi gerekli.'], 401);
        }

        ensureCompanyPaymentsTable();
        $validated = request()->validate([
            'companyId' => ['required', 'integer'],
            'month' => ['required', 'date_format:Y-m'],
            'paid' => ['required', 'boolean'],
        ]);

        $company = DB::table('client_companies')->where('id', $validated['companyId'])->first();

        if (! $company) {
            return response()->json(['message' => 'Firma bulunamadi.'], 404);
        }

        $paidAt = $validated['paid'] ? now() : null;
        DB::table('company_payments')->updateOrInsert(
            [
                'client_company_id' => (int) $validated['companyId'],
                'month' => $validated['month'],
            ],
            [
                'paid_at' => $paidAt,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json([
            'payment' => [
                'companyId' => (string) $validated['companyId'],
                'month' => $validated['month'],
                'paid' => (bool) $validated['paid'],
                'paidAt' => $paidAt,
            ],
        ]);
    } catch (\Illuminate\Validation\ValidationException $exception) {
        return response()->json([
            'message' => collect($exception->errors())->flatten()->first() ?? 'Odeme bilgisi gecersiz.',
            'errors' => $exception->errors(),
        ], 422);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Odeme kaydi guncellenemedi: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::get('/notifications', function () {
    try {
        ensureAppNotificationsTable();
        cleanupOldAppNotifications();

        $companyCode = request()->query('companyCode');
        $serviceDate = request()->query('serviceDate');

        $query = DB::table('app_notifications')
            ->leftJoin('client_companies', 'client_companies.id', '=', 'app_notifications.client_company_id')
            ->select([
                'app_notifications.*',
                'client_companies.name as company_name',
                'client_companies.code as company_code',
            ]);

        if ($companyCode) {
            $company = authenticatedCompanyForRequest(request(), (string) $companyCode);

            if (! $company) {
                return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
            }

            $query->where('app_notifications.client_company_id', $company->id)
                ->where('app_notifications.audience', 'company');
        } else {
            if (! requestHasValidAdminToken(request())) {
                return response()->json(['message' => 'Admin girisi gerekli.'], 401);
            }

            $query->whereNull('app_notifications.admin_cleared_at');
        }

        if ($serviceDate) {
            $query->whereDate('app_notifications.service_date', $serviceDate);
        }

        $notifications = $query
            ->orderByRaw('app_notifications.read_at IS NULL DESC')
            ->orderByDesc('app_notifications.created_at')
            ->limit(100)
            ->get()
            ->map(fn ($notification) => serializeAppNotification($notification));

        return response()->json([
            'notifications' => $notifications,
            'unreadCount' => $notifications->filter(fn ($notification) => $notification['readAt'] === null)->count(),
        ]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Bildirim sorgu hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::post('/notifications/meal-reminders', function () {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAppNotificationsTable();
        cleanupOldAppNotifications();

        $validated = request()->validate([
            'serviceDate' => ['required', 'date_format:Y-m-d'],
        ]);

        $serviceDate = $validated['serviceDate'];
        $today = now('Europe/Istanbul')->toDateString();

        if ($serviceDate !== $today) {
            return response()->json(['message' => 'Hatirlatma sadece bugunun firmalarina gonderilebilir.'], 422);
        }

        $missingCompanies = getCompaniesMissingMealEatenNotification($serviceDate);
        $now = now();
        $createdCount = 0;

        foreach ($missingCompanies as $company) {
            $existingNotification = DB::table('app_notifications')
                ->where('client_company_id', $company->id)
                ->where('type', 'meal_eaten_missing')
                ->whereDate('service_date', $serviceDate)
                ->first();

            if ($existingNotification) {
                DB::table('app_notifications')->where('id', $existingNotification->id)->update([
                    'audience' => 'company',
                    'title' => 'Yemek yenildi bildirimi bekleniyor',
                    'message' => 'Bugun yemek yenildi bilgisi henuz catering firmasina gonderilmedi. Lutfen yemek yenildi butonuna basarak catering firmasini bilgilendirin.',
                    'read_at' => null,
                    'admin_cleared_at' => null,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('app_notifications')->insert([
                    'client_company_id' => $company->id,
                    'audience' => 'company',
                    'type' => 'meal_eaten_missing',
                    'service_date' => $serviceDate,
                    'title' => 'Yemek yenildi bildirimi bekleniyor',
                    'message' => 'Bugun yemek yenildi bilgisi henuz catering firmasina gonderilmedi. Lutfen yemek yenildi butonuna basarak catering firmasini bilgilendirin.',
                    'read_at' => null,
                    'admin_cleared_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $createdCount += 1;
            }
        }

        return response()->json([
            'message' => $missingCompanies->count().' firmaya yemek yenildi hatirlatmasi hazirlandi.',
            'createdCount' => $createdCount,
            'missingCount' => $missingCompanies->count(),
            'companies' => $missingCompanies->map(fn ($company) => [
                'id' => (string) $company->id,
                'code' => $company->code,
                'name' => $company->name,
            ])->values(),
        ]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Hatirlatma gonderme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::post('/notifications', function () {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAppNotificationsTable();
        cleanupOldAppNotifications();

        $validated = request()->validate([
            'companyIds' => ['required', 'array', 'min:1'],
            'companyIds.*' => ['integer'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $companyIds = collect($validated['companyIds'])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        $companies = DB::table('client_companies')
            ->whereIn('id', $companyIds)
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('role')->orWhere('role', 'customer');
            })
            ->where(function ($query) {
                $query->whereNull('hidden')->orWhere('hidden', false);
            })
            ->get();

        if ($companies->isEmpty()) {
            return response()->json(['message' => 'Bildirim gonderilecek aktif firma bulunamadi.'], 422);
        }

        $now = now();

        foreach ($companies as $company) {
            DB::table('app_notifications')->insert([
                'client_company_id' => $company->id,
                'audience' => 'company',
                'type' => 'general',
                'service_date' => null,
                'title' => $validated['title'],
                'message' => $validated['message'],
                'read_at' => null,
                'admin_cleared_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return response()->json([
            'message' => $companies->count().' firmaya bildirim gonderildi.',
            'createdCount' => $companies->count(),
            'companies' => $companies->map(fn ($company) => [
                'id' => (string) $company->id,
                'code' => $company->code,
                'name' => $company->name,
            ])->values(),
        ], 201);
    } catch (\Illuminate\Validation\ValidationException $exception) {
        return response()->json([
            'message' => collect($exception->errors())->flatten()->first() ?? 'Bildirim bilgisi gecersiz.',
            'errors' => $exception->errors(),
        ], 422);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Bildirim gonderme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::delete('/notifications', function () {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAppNotificationsTable();

        $scope = (string) request()->query('scope', request()->input('scope', 'admin'));

        if (! in_array($scope, ['admin', 'customers'], true)) {
            return response()->json(['message' => 'Gecersiz temizleme turu.'], 422);
        }

        if ($scope === 'admin') {
            $count = DB::table('app_notifications')
                ->whereNull('admin_cleared_at')
                ->update([
                    'admin_cleared_at' => now(),
                    'updated_at' => now(),
                ]);

            return response()->json([
                'message' => 'Catering bildirim listesi temizlendi.',
                'deletedCount' => $count,
            ]);
        }

        $count = DB::table('app_notifications')
            ->where('audience', 'company')
            ->delete();

        return response()->json([
            'message' => 'Musteri ekranlarindaki bildirimler temizlendi.',
            'deletedCount' => $count,
        ]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Bildirim temizleme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::delete('/notifications/{notification}', function (string $notification) {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAppNotificationsTable();

        $deleted = DB::table('app_notifications')
            ->where('id', $notification)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Bildirim bulunamadi.'], 404);
        }

        return response()->json(['message' => 'Bildirim musteriden kaldirildi.']);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Bildirim silme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::patch('/notifications/{notification}', function (string $notification) {
    try {
        ensureAppNotificationsTable();

        $row = DB::table('app_notifications')->where('id', $notification)->first();

        if (! $row) {
            return response()->json(['message' => 'Bildirim bulunamadi.'], 404);
        }

        if (! requestHasValidAdminToken(request())) {
            $companyCode = request()->input('companyCode');
            $company = authenticatedCompanyForRequest(request(), (string) $companyCode);

            if (! $company || (int) $company->id !== (int) $row->client_company_id) {
                return response()->json(['message' => 'Bildirim icin yetki yok.'], 401);
            }
        }

        DB::table('app_notifications')->where('id', $row->id)->update([
            'read_at' => request()->boolean('read', true) ? now() : null,
            'updated_at' => now(),
        ]);

        $updated = DB::table('app_notifications')
            ->leftJoin('client_companies', 'client_companies.id', '=', 'app_notifications.client_company_id')
            ->select([
                'app_notifications.*',
                'client_companies.name as company_name',
                'client_companies.code as company_code',
            ])
            ->where('app_notifications.id', $row->id)
            ->first();

        return response()->json(['notification' => serializeAppNotification($updated)]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Bildirim guncelleme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
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
            'message' => 'Menu listesi hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
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
            'message' => 'Menu gunleri hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
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
            cleanupMenuStorage($month);

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
            'message' => 'Menu gunleri kaydetme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
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
            'message' => 'Menu PDF acma hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
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

        $id = DB::transaction(function () use ($parsedDays, $validated, $attributes, $now) {
            cleanupMenuStorage($validated['month'], true);
            $id = DB::table('menu_documents')->insertGetId($attributes);

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

            return $id;
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
            'message' => 'Menu PDF yukleme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
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
            'message' => 'Menu PDF silme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::get('/debug/schema', function () {
    if (! requestHasValidAdminToken(request()) || ! config('app.debug')) {
        return response()->json(['message' => 'Not found.'], 404);
    }

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
                        'error' => (config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
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
                    'mealUnitPrice' => (float) ($company->meal_unit_price ?? 170),
                    'mealVatEnabled' => (bool) ($company->meal_vat_enabled ?? false),
                    'active' => (bool) $company->active,
                    'createdAt' => $company->created_at,
                    'updatedAt' => $company->updated_at,
                ]);

            return response()->json(['companies' => $companies]);
        } catch (Throwable $exception) {
            return response()->json([
                'message' => 'Client companies hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
                'type' => config('app.debug') ? $exception::class : null,
            ], 500);
        }
});
Route::post('/client-companies', function () {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAccountColumns();

        $validated = request()->validate([
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
            'meal_unit_price' => $validated['mealUnitPrice'] ?? 170,
            'meal_vat_enabled' => $validated['mealVatEnabled'] ?? false,
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
                'mealUnitPrice' => (float) ($company->meal_unit_price ?? 170),
                'mealVatEnabled' => (bool) ($company->meal_vat_enabled ?? false),
                'active' => (bool) $company->active,
                'createdAt' => $company->created_at,
                'updatedAt' => $company->updated_at,
            ],
        ], 201);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Client company olusturma hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});
Route::put('/client-companies/{clientCompany}', function (string $clientCompany) {
    if (! requestHasValidAdminToken(request())) {
        return response()->json(['message' => 'Admin girisi gerekli.'], 401);
    }

    try {
        ensureAccountColumns();

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
            'active' => $validated['active'] ?? (bool) $company->active,
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('client_companies', 'tax_number')) {
            $updates['tax_number'] = $validated['taxNumber'] ?? null;
        }

        if (Schema::hasColumn('client_companies', 'notes')) {
            $updates['notes'] = $validated['notes'] ?? null;
        }

        if (Schema::hasColumn('client_companies', 'meal_unit_price')) {
            $updates['meal_unit_price'] = $validated['mealUnitPrice'] ?? (float) ($company->meal_unit_price ?? 170);
        }

        if (Schema::hasColumn('client_companies', 'meal_vat_enabled')) {
            $updates['meal_vat_enabled'] = $validated['mealVatEnabled'] ?? (bool) ($company->meal_vat_enabled ?? false);
        }

        if (! empty($validated['password'])) {
            $updates['password_hash'] = Illuminate\Support\Facades\Hash::make($validated['password']);
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
                'mealUnitPrice' => (float) ($updatedCompany->meal_unit_price ?? 170),
                'mealVatEnabled' => (bool) ($updatedCompany->meal_vat_enabled ?? false),
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
            'message' => 'Sirket guncelleme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});
Route::patch('/client-companies/{companyCode}/password', function (string $companyCode) {
    try {
        ensureAccountColumns();

        $validated = request()->validate([
            'currentPassword' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ]);

        $company = authenticatedCompanyForRequest(request(), $companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
        }

        if (! ($company->password_hash ?? null) || ! Illuminate\Support\Facades\Hash::check($validated['currentPassword'], $company->password_hash)) {
            return response()->json(['message' => 'Mevcut sifre hatali.'], 422);
        }

        $passwordHash = Illuminate\Support\Facades\Hash::make($validated['password']);

        DB::table('client_companies')->where('id', $company->id)->update([
            'password_hash' => $passwordHash,
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Sifre guncellendi.'])
            ->cookie(makeSessionCookie('maharet_company_session', makeSignedSessionToken([
                'role' => 'customer',
                'companyId' => (int) $company->id,
                'username' => $company->username,
                'passwordHash' => hash('sha256', $passwordHash),
            ])));
    } catch (\Illuminate\Validation\ValidationException $exception) {
        return response()->json([
            'message' => collect($exception->errors())->flatten()->first() ?? 'Sifre bilgileri gecersiz.',
            'errors' => $exception->errors(),
        ], 422);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Sifre guncelleme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
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
            'message' => 'Sirket silme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});
Route::get('/client-companies/{companyCode}/people', function (string $companyCode) {
    try {
        ensureAccountColumns();

        $company = authenticatedCompanyForRequest(request(), $companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
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
        return response()->json(['message' => 'Kisi listesi hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata')], 500);
    }
});
Route::post('/client-companies/{companyCode}/people', function (string $companyCode) {
    try {
        ensureAccountColumns();

        $company = authenticatedCompanyForRequest(request(), $companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
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
        return response()->json(['message' => 'Kisi ekleme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata')], 500);
    }
});
Route::patch('/client-companies/{companyCode}/people/{person}', function (string $companyCode, string $person) {
    try {
        ensureAccountColumns();

        $company = authenticatedCompanyForRequest(request(), $companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
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
        return response()->json(['message' => 'Kisi guncelleme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata')], 500);
    }
});
Route::delete('/client-companies/{companyCode}/people/{person}', function (string $companyCode, string $person) {
    try {
        ensureAccountColumns();

        $company = authenticatedCompanyForRequest(request(), $companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
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
        return response()->json(['message' => 'Kisi silme hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata')], 500);
    }
});
Route::get('/client-companies/{companyCode}', function (string $companyCode) {
    try {
        ensureAccountColumns();

        $company = authenticatedCompanyForRequest(request(), $companyCode);

        if (! $company) {
            return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
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
                'mealUnitPrice' => (float) ($company->meal_unit_price ?? 170),
                'mealVatEnabled' => (bool) ($company->meal_vat_enabled ?? false),
                'active' => (bool) $company->active,
                'createdAt' => $company->created_at,
                'updatedAt' => $company->updated_at,
            ],
        ]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Sirket uyeligi sorgu hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});

Route::get('/meal-requests', function () {
    try {
        applyMealStatusAutomation();

        $serviceDate = request()->query('serviceDate', now()->toDateString());
        $companyCode = request()->query('companyCode');
        $company = null;

        if ($companyCode) {
            $company = authenticatedCompanyForRequest(request(), (string) $companyCode);

            if (! $company) {
                return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
            }
        } elseif (! requestHasValidAdminToken(request())) {
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
            ->when($company, fn ($query) => $query->where('meal_requests.client_company_id', $company->id))
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
            'message' => 'Meal requests hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});
Route::post('/meal-requests', function () {
    try {
        ensureAppNotificationsTable();

        $validated = request()->validate([
            'companyCode' => ['required', 'string', 'max:120'],
            'serviceDate' => ['nullable', 'date_format:Y-m-d'],
            'headcount' => ['required', 'integer', 'min:0', 'max:100000'],
            'personIds' => ['nullable', 'array'],
            'personIds.*' => ['integer'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $company = authenticatedCompanyForRequest(request(), $validated['companyCode']);

        if (! $company) {
            return response()->json(['message' => 'Sirket girisi gerekli.'], 401);
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

        DB::table('app_notifications')
            ->where('client_company_id', $company->id)
            ->whereIn('type', ['meal_missing', 'meal_eaten_missing'])
            ->whereDate('service_date', $serviceDate)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);

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
            'message' => 'Meal request olusturma hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});
Route::patch('/meal-requests/{requestNo}', function (string $requestNo) {
    try {
        applyMealStatusAutomation();

        $status = (string) request()->input('status', '');
        $allowedStatuses = ['eaten', 'collected'];

        if (! in_array($status, $allowedStatuses, true)) {
            return response()->json(['message' => 'Gecersiz yemek durumu.'], 422);
        }

        if ($status === 'collected' && ! requestHasValidAdminToken(request())) {
            return response()->json(['message' => 'Admin girisi gerekli.'], 401);
        }

        $mealRequest = DB::table('meal_requests')
            ->where('request_no', $requestNo)
            ->first();

        if (! $mealRequest) {
            return response()->json(['message' => 'Yemek talebi bulunamadi.'], 404);
        }

        if ($status === 'eaten' && ! requestHasValidAdminToken(request())) {
            $company = authenticatedCompanyForRequest(request());

            if (! $company || (int) $company->id !== (int) $mealRequest->client_company_id) {
                return response()->json(['message' => 'Yemek talebi icin yetki yok.'], 401);
            }
        }

        $settings = getOperationalSettings();
        $nowIstanbul = now('Europe/Istanbul');
        $today = $nowIstanbul->toDateString();
        $time = $nowIstanbul->format('H:i');
        $serviceDate = (string) $mealRequest->service_date;

        if ($serviceDate !== $today) {
            return response()->json(['message' => 'Yemek durumu sadece bugunun kaydi icin isaretlenebilir.'], 422);
        }

        if ($status === 'eaten' && $time > $settings['eatenDeadline']) {
            applyMealStatusAutomation();

            return response()->json(['message' => 'Yemek yenildi isareti icin belirlenen saat gecti.'], 422);
        }

        if ($status === 'collected' && $time > $settings['collectedDeadline']) {
            applyMealStatusAutomation();

            return response()->json(['message' => 'Toplandi isareti icin belirlenen saat gecti.'], 422);
        }

        if ($status === 'collected' && $mealRequest->status === 'submitted') {
            return response()->json(['message' => 'Toplandi isaretlemek icin once yemek yenildi bilgisi gelmeli.'], 422);
        }

        $updates = [
            'status' => $status,
            'updated_at' => now(),
        ];

        if ($status === 'eaten') {
            $updates['eaten_at'] = $mealRequest->eaten_at ?: now();
        }

        if ($status === 'collected') {
            $updates['eaten_at'] = $mealRequest->eaten_at ?: now();
            $updates['collected_at'] = now();
        }

        DB::table('meal_requests')
            ->where('id', $mealRequest->id)
            ->update($updates);

        if ($status === 'eaten') {
            ensureAppNotificationsTable();

            DB::table('app_notifications')
                ->where('client_company_id', $mealRequest->client_company_id)
                ->where('type', 'meal_eaten_missing')
                ->whereDate('service_date', $serviceDate)
                ->whereNull('read_at')
                ->update([
                    'read_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        $updatedRequest = DB::table('meal_requests')
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
            ->where('meal_requests.id', $mealRequest->id)
            ->first();

        $people = DB::table('meal_request_people')
            ->join('company_people', 'company_people.id', '=', 'meal_request_people.company_person_id')
            ->where('meal_request_people.meal_request_id', $updatedRequest->id)
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
                'requestNo' => $updatedRequest->request_no,
                'companyId' => (string) $updatedRequest->client_company_id,
                'companyCode' => $updatedRequest->company_code,
                'companyName' => $updatedRequest->company_name,
                'serviceDate' => $updatedRequest->service_date,
                'headcount' => (int) $updatedRequest->headcount,
                'status' => $updatedRequest->status,
                'note' => $updatedRequest->note,
                'submittedAt' => $updatedRequest->created_at,
                'eatenAt' => $updatedRequest->eaten_at,
                'collectedAt' => $updatedRequest->collected_at,
                'updatedAt' => $updatedRequest->updated_at,
                'people' => $people,
            ],
        ]);
    } catch (Throwable $exception) {
        return response()->json([
            'message' => 'Meal request durum hata: '.(config('app.debug') ? $exception->getMessage() : 'Beklenmeyen hata'),
            'type' => config('app.debug') ? $exception::class : null,
        ], 500);
    }
});
