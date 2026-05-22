<?php

$token = 'maharet-diagnose-20260507';

if (($_GET['token'] ?? '') !== $token) {
    http_response_code(404);
    exit('Not found.');
}

$appPath = realpath(__DIR__.'/../../maharet-api');

if ($appPath === false) {
    http_response_code(500);
    exit('Laravel application path not found.');
}

require $appPath.'/vendor/autoload.php';

$app = require $appPath.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$result = [
    'appPath' => $appPath,
    'phpVersion' => PHP_VERSION,
    'extensions' => [
        'pdo_mysql' => extension_loaded('pdo_mysql'),
        'dom' => extension_loaded('dom'),
        'mbstring' => extension_loaded('mbstring'),
        'openssl' => extension_loaded('openssl'),
    ],
    'files' => [],
    'route' => null,
    'rawInsert' => null,
    'modelCreate' => null,
    'latestLog' => null,
];

$fileChecks = [
    'controller' => $appPath.'/app/Http/Controllers/Api/ClientCompanyController.php',
    'routes' => $appPath.'/routes/api.php',
];

foreach ($fileChecks as $key => $path) {
    $contents = is_file($path) ? file_get_contents($path) : '';
    $result['files'][$key] = [
        'path' => $path,
        'exists' => is_file($path),
        'mtime' => is_file($path) ? date('c', filemtime($path)) : null,
        'md5' => is_file($path) ? md5_file($path) : null,
        'hasCreateCatch' => str_contains($contents, 'Client company olusturma hata'),
        'hasSchemaDetails' => str_contains($contents, "'details' =>"),
    ];
}

foreach (Illuminate\Support\Facades\Route::getRoutes() as $route) {
    if (in_array('POST', $route->methods(), true) && $route->uri() === 'api/client-companies') {
        $result['route'] = [
            'uri' => $route->uri(),
            'methods' => $route->methods(),
            'action' => $route->getActionName(),
        ];
        break;
    }
}

$unique = 'diag-'.date('YmdHis').'-'.random_int(1000, 9999);

try {
    $id = Illuminate\Support\Facades\DB::table('client_companies')->insertGetId([
        'code' => $unique.'-raw',
        'username' => $unique.'-raw',
        'password_hash' => Illuminate\Support\Facades\Hash::make('123456'),
        'name' => 'Diag Raw',
        'contact_name' => 'Diag',
        'phone' => '000',
        'email' => 'diag-raw@example.com',
        'address' => 'Diag',
        'tax_number' => '000',
        'notes' => 'Diag',
        'active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    Illuminate\Support\Facades\DB::table('client_companies')->where('id', $id)->delete();
    $result['rawInsert'] = ['ok' => true, 'id' => $id];
} catch (Throwable $exception) {
    $result['rawInsert'] = [
        'ok' => false,
        'type' => $exception::class,
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
    ];
}

try {
    $company = App\Models\ClientCompany::create([
        'code' => $unique.'-model',
        'username' => $unique.'-model',
        'password_hash' => Illuminate\Support\Facades\Hash::make('123456'),
        'name' => 'Diag Model',
        'contact_name' => 'Diag',
        'phone' => '000',
        'email' => 'diag-model@example.com',
        'address' => 'Diag',
        'tax_number' => '000',
        'notes' => 'Diag',
        'active' => true,
    ]);
    $id = $company->id;
    $company->delete();
    $result['modelCreate'] = ['ok' => true, 'id' => $id];
} catch (Throwable $exception) {
    $result['modelCreate'] = [
        'ok' => false,
        'type' => $exception::class,
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
    ];
}

$logPath = $appPath.'/storage/logs/laravel.log';
if (is_file($logPath)) {
    $contents = file_get_contents($logPath, false, null, max(0, filesize($logPath) - 8000));
    $result['latestLog'] = $contents;
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

