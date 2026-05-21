<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_people', function (Blueprint $table) {
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
    }

    public function down(): void
    {
        Schema::dropIfExists('company_people');
    }
};
