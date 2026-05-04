<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_request_counters', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->unsignedInteger('next_value');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_request_counters');
    }
};
