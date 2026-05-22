<?php

$token = 'maharet-repair-20260507';

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
    'database' => null,
    'before' => [],
    'after' => [],
    'actions' => [],
    'errors' => [],
];

$columnInfo = function (string $table, string $column): ?object {
    return Illuminate\Support\Facades\DB::table('information_schema.columns')
        ->select(['column_name', 'column_type', 'column_key', 'extra', 'is_nullable', 'column_default'])
        ->whereRaw('table_schema = DATABASE()')
        ->where('table_name', $table)
        ->where('column_name', $column)
        ->first();
};

$primaryExists = function (string $table): bool {
    return Illuminate\Support\Facades\DB::table('information_schema.statistics')
        ->whereRaw('table_schema = DATABASE()')
        ->where('table_name', $table)
        ->where('index_name', 'PRIMARY')
        ->exists();
};

$ensureAutoIncrement = function (string $table) use ($columnInfo, $primaryExists, &$result): void {
    $info = $columnInfo($table, 'id');
    $result['before'][$table.'.id'] = $info;

    if (! $info) {
        throw new RuntimeException("{$table}.id column not found.");
    }

    if (! $primaryExists($table)) {
        Illuminate\Support\Facades\DB::statement("ALTER TABLE `{$table}` ADD PRIMARY KEY (`id`)");
        $result['actions'][] = "Added PRIMARY KEY on {$table}.id";
    }

    if (stripos((string) $info->extra, 'auto_increment') === false) {
        Illuminate\Support\Facades\DB::statement("ALTER TABLE `{$table}` MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
        $result['actions'][] = "Set AUTO_INCREMENT on {$table}.id";
    }

    $result['after'][$table.'.id'] = $columnInfo($table, 'id');
};

try {
    $result['database'] = Illuminate\Support\Facades\DB::selectOne('SELECT DATABASE() AS db')->db ?? null;

    $ensureAutoIncrement('client_companies');
    $ensureAutoIncrement('meal_requests');

    Illuminate\Support\Facades\DB::statement(
        "INSERT IGNORE INTO `meal_request_counters` (`key`, `next_value`) VALUES ('meal_request', 1)"
    );
    $result['actions'][] = 'Ensured meal_request counter exists';
} catch (Throwable $exception) {
    $result['errors'][] = $exception::class.': '.$exception->getMessage();
}

foreach (['optimize:clear', 'config:clear', 'route:clear', 'view:clear', 'cache:clear'] as $command) {
    try {
        Illuminate\Support\Facades\Artisan::call($command);
        $result['actions'][] = "Ran php artisan {$command}";
    } catch (Throwable $exception) {
        $result['errors'][] = "php artisan {$command}: ".$exception->getMessage();
    }
}

foreach (glob($appPath.'/bootstrap/cache/*.php') ?: [] as $cacheFile) {
    $name = basename($cacheFile);

    if (! in_array($name, ['packages.php', 'services.php'], true) && @unlink($cacheFile)) {
        $result['actions'][] = "Deleted {$cacheFile}";
    }
}

if (function_exists('opcache_reset') && @opcache_reset()) {
    $result['actions'][] = 'Reset OPcache';
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

