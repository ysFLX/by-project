<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_request_people', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meal_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_person_id')->constrained('company_people')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['meal_request_id', 'company_person_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_request_people');
    }
};
