<?php

$token = 'maharet-install-controller-20260507';

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

$ensureDirectory = function (string $path) use (&$result): void {
    if (is_dir($path)) {
        return;
    }

    if (@mkdir($path, 0755, true)) {
        $result['createdDirectories'][] = $path;
        return;
    }

    $result['errors'][] = "Could not create directory: {$path}";
};

foreach ([
    $appPath.'/app/Http/Controllers/Api',
    $appPath.'/storage/framework/cache',
    $appPath.'/storage/framework/cache/data',
    $appPath.'/storage/framework/sessions',
    $appPath.'/storage/framework/views',
    $appPath.'/storage/logs',
] as $directory) {
    $ensureDirectory($directory);
}

$controller = <<<'PHP'
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
            return response()->json(['message' => 'Client companies hata: '.$exception->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
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

        $code = Str::slug($validated['code'] ?? $validated['username'] ?? $this->makeCompanyCode($validated['name']));
        $username = Str::slug($validated['username'] ?? $code);

        if (ClientCompany::where('code', $code)->exists()) {
            return response()->json(['message' => 'Bu uyelik kodu zaten kullaniliyor.'], 422);
        }

        if (ClientCompany::where('username', $username)->exists()) {
            return response()->json(['message' => 'Bu kullanici adi zaten kullaniliyor.'], 422);
        }

        try {
            $company = ClientCompany::create([
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
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Client company olusturma hata: '.$exception->getMessage(),
                'type' => $exception::class,
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
            'active' => ['nullable', 'boolean'],
        ]);

        $clientCompany->update([
            'name' => $validated['name'],
            'contact_name' => $validated['contactName'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'tax_number' => $validated['taxNumber'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'active' => $validated['active'] ?? $clientCompany->active,
        ]);

        return response()->json(['company' => $this->serializeCompany($clientCompany->fresh())]);
    }

    public function destroy(ClientCompany $clientCompany): JsonResponse
    {
        $clientCompany->delete();

        return response()->json(['message' => 'Sirket uyeligi silindi.']);
    }

    public function showByCode(string $companyCode): JsonResponse
    {
        $company = ClientCompany::where('code', Str::slug($companyCode))->first();

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

            if ($username === 'admin' && hash_equals((string) env('ADMIN_PASSWORD', 'admin123'), $password)) {
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

            $company = ClientCompany::where('username', Str::slug($validated['username']))
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
            return response()->json(['message' => 'Backend hata: '.$exception->getMessage()], 500);
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
            'contactName' => $company->contact_name,
            'phone' => $company->phone,
            'email' => $company->email,
            'address' => $company->address,
            'taxNumber' => $company->tax_number,
            'notes' => $company->notes,
            'active' => $company->active,
            'createdAt' => $company->created_at?->toISOString(),
            'updatedAt' => $company->updated_at?->toISOString(),
        ];
    }
}
PHP;

$controllerPath = $appPath.'/app/Http/Controllers/Api/ClientCompanyController.php';

if (@file_put_contents($controllerPath, $controller) === false) {
    $result['errors'][] = "Could not write controller: {$controllerPath}";
} else {
    @chmod($controllerPath, 0644);
    $result['writtenFiles'][] = [
        'path' => $controllerPath,
        'bytes' => filesize($controllerPath),
        'md5' => md5_file($controllerPath),
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

