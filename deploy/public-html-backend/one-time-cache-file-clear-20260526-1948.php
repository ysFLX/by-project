<?php

$token = 'file-clear-20260526-1948-a91c2e70';

if (($_GET['token'] ?? '') !== $token) {
    http_response_code(404);
    exit('Not found.');
}

$appPath = realpath(__DIR__.'/../../maharet-api');

if ($appPath === false) {
    http_response_code(500);
    @unlink(__FILE__);
    exit('Application path not found.');
}

$deleted = [];
$failed = [];

$deleteFile = function (string $path) use (&$deleted, &$failed): void {
    if (! is_file($path)) {
        return;
    }

    if (@unlink($path)) {
        $deleted[] = str_replace($GLOBALS['appPath'].'/', '', $path);
        return;
    }

    $failed[] = str_replace($GLOBALS['appPath'].'/', '', $path);
};

$deleteFilesIn = function (string $directory) use (&$deleteFilesIn, $deleteFile): void {
    if (! is_dir($directory)) {
        return;
    }

    foreach (scandir($directory) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..' || $entry === '.gitignore') {
            continue;
        }

        $path = $directory.'/'.$entry;

        if (is_dir($path)) {
            $deleteFilesIn($path);
            @rmdir($path);
            continue;
        }

        $deleteFile($path);
    }
};

foreach (glob($appPath.'/bootstrap/cache/*.php') ?: [] as $cacheFile) {
    $name = basename($cacheFile);

    if (! in_array($name, ['packages.php', 'services.php'], true)) {
        $deleteFile($cacheFile);
    }
}

$deleteFilesIn($appPath.'/storage/framework/views');
$deleteFilesIn($appPath.'/storage/framework/cache/data');

$opcacheReset = function_exists('opcache_reset') ? @opcache_reset() : false;
$selfDeleted = @unlink(__FILE__);

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'ok' => count($failed) === 0,
    'deletedCount' => count($deleted),
    'failedCount' => count($failed),
    'deleted' => $deleted,
    'failed' => $failed,
    'opcacheReset' => $opcacheReset,
    'selfDeleted' => $selfDeleted,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
