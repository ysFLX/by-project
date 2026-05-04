<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_no')->unique();
            $table->foreignId('client_company_id')->constrained()->cascadeOnDelete();
            $table->date('service_date')->index();
            $table->unsignedInteger('headcount');
            $table->string('status')->default('submitted')->index();
            $table->text('note')->nullable();
            $table->timestamp('eaten_at')->nullable();
            $table->timestamp('collected_at')->nullable();
            $table->timestamps();

            $table->unique(['client_company_id', 'service_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_requests');
    }
};
