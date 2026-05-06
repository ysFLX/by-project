<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_companies', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('code');
            $table->string('password_hash')->nullable()->after('username');
            $table->string('phone')->nullable()->after('contact_name');
            $table->string('email')->nullable()->after('phone');
            $table->string('address')->nullable()->after('email');
            $table->string('tax_number')->nullable()->after('address');
            $table->text('notes')->nullable()->after('tax_number');
        });
    }

    public function down(): void
    {
        Schema::table('client_companies', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn([
                'username',
                'password_hash',
                'phone',
                'email',
                'address',
                'tax_number',
                'notes',
            ]);
        });
    }
};
