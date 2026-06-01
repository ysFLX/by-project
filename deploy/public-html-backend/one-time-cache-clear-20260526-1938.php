<?php

$token = 'clear-20260526-1938-7f4b8d2c9a';

if (($_GET['token'] ?? '') !== $token) {
    http_response_code(404);
    exit('Not found.');
}

$appPath = realpath(__DIR__.'/../../maharet-api');

if ($appPath === false || ! is_file($appPath.'/vendor/autoload.php')) {
    http_response_code(500);
    @unlink(__FILE__);
    exit('Application path not found.');
}

require $appPath.'/vendor/autoload.php';

$app = require $appPath.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$commands = ['optimize:clear', 'config:clear', 'route:clear', 'view:clear', 'cache:clear'];
$results = [];

foreach ($commands as $command) {
    try {
        Illuminate\Support\Facades\Artisan::call($command);
        $results[$command] = 'ok';
    } catch (Throwable $exception) {
        $results[$command] = 'failed';
    }
}

$opcacheReset = function_exists('opcache_reset') ? @opcache_reset() : false;
$deleted = @unlink(__FILE__);

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'ok' => ! in_array('failed', $results, true),
    'commands' => $results,
    'opcacheReset' => $opcacheReset,
    'selfDeleted' => $deleted,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
