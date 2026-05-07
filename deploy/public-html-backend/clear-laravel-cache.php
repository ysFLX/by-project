<?php

$token = 'maharet-cache-20260507';

if (($_GET['token'] ?? '') !== $token) {
    http_response_code(404);
    exit('Not found.');
}

$appPath = realpath(__DIR__.'/../../maharet-api');

if ($appPath === false) {
    http_response_code(500);
    exit('Laravel application path not found.');
}

$deleted = [];
$missed = [];

$deleteFile = function (string $path) use (&$deleted, &$missed): void {
    if (! file_exists($path)) {
        return;
    }

    if (is_file($path) && @unlink($path)) {
        $deleted[] = $path;
        return;
    }

    $missed[] = $path;
};

$deleteFilesIn = function (string $directory, array $keep = []) use ($deleteFile): void {
    if (! is_dir($directory)) {
        return;
    }

    foreach (scandir($directory) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..' || in_array($entry, $keep, true)) {
            continue;
        }

        $path = $directory.'/'.$entry;

        if (is_file($path)) {
            $deleteFile($path);
        }
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

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'ok' => empty($missed),
    'appPath' => $appPath,
    'deleted' => $deleted,
    'missed' => $missed,
    'opcacheReset' => $opcacheReset,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

