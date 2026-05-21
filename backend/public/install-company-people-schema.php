<?php

$token = 'maharet-people-schema-20260518';

if (($_GET['token'] ?? '') !== $token) {
    http_response_code(404);
    exit('Not found.');
}

$appPath = realpath(__DIR__.'/..');

if ($appPath === false || ! is_file($appPath.'/vendor/autoload.php')) {
    http_response_code(500);
    exit('Laravel application path not found.');
}

require $appPath.'/vendor/autoload.php';

$app = require $appPath.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$result = [
    'appPath' => $appPath,
    'database' => null,
    'actions' => [],
    'tables' => [],
    'errors' => [],
];

$markMigrationRan = function (string $migration) use (&$result): void {
    if (! Illuminate\Support\Facades\Schema::hasTable('migrations')) {
        return;
    }

    if (Illuminate\Support\Facades\DB::table('migrations')->where('migration', $migration)->exists()) {
        return;
    }

    $batch = (int) Illuminate\Support\Facades\DB::table('migrations')->max('batch') + 1;

    Illuminate\Support\Facades\DB::table('migrations')->insert([
        'migration' => $migration,
        'batch' => $batch,
    ]);

    $result['actions'][] = "Marked migration {$migration} as ran";
};

try {
    $result['database'] = Illuminate\Support\Facades\DB::selectOne('SELECT DATABASE() AS db')->db ?? null;

    if (! Illuminate\Support\Facades\Schema::hasTable('company_people')) {
        Illuminate\Support\Facades\Schema::create('company_people', function (Illuminate\Database\Schema\Blueprint $table) {
            $table->id();
            $table->foreignId('client_company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('department')->nullable();
            $table->string('employee_code')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['client_company_id', 'employee_code']);
        });

        $result['actions'][] = 'Created company_people table';
    } else {
        $result['actions'][] = 'company_people table already exists';
    }

    if (! Illuminate\Support\Facades\Schema::hasTable('meal_request_people')) {
        Illuminate\Support\Facades\Schema::create('meal_request_people', function (Illuminate\Database\Schema\Blueprint $table) {
            $table->id();
            $table->foreignId('meal_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_person_id')->constrained('company_people')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['meal_request_id', 'company_person_id']);
        });

        $result['actions'][] = 'Created meal_request_people table';
    } else {
        $result['actions'][] = 'meal_request_people table already exists';
    }

    $markMigrationRan('2026_05_18_000001_create_company_people_table');
    $markMigrationRan('2026_05_18_000002_create_meal_request_people_table');

    foreach (['company_people', 'meal_request_people'] as $table) {
        $result['tables'][$table] = [
            'exists' => Illuminate\Support\Facades\Schema::hasTable($table),
            'columns' => Illuminate\Support\Facades\Schema::hasTable($table)
                ? Illuminate\Support\Facades\Schema::getColumnListing($table)
                : [],
        ];
    }
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
