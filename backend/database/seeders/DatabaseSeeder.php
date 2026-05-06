<?php

namespace Database\Seeders;

use App\Models\ClientCompany;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $companies = [
            [
                'code' => 'aytek',
                'username' => 'aytek',
                'name' => 'Aytek Yazilim',
                'contact_name' => 'Elif Demir',
                'phone' => '0332 245 19 29',
                'email' => 'operasyon@aytek.test',
                'address' => 'Karatay, Konya',
                'tax_number' => '1234567890',
                'notes' => 'Hafta ici ogle servisi.',
            ],
            [
                'code' => 'kuzey-lojistik',
                'username' => 'kuzey',
                'name' => 'Kuzey Lojistik',
                'contact_name' => 'Mert Arslan',
                'phone' => '0332 444 10 42',
                'email' => 'mert@kuzeylojistik.test',
                'address' => 'Selcuklu, Konya',
                'tax_number' => '2345678901',
                'notes' => 'Servis saati 12:30.',
            ],
            [
                'code' => 'orion-tekstil',
                'username' => 'orion',
                'name' => 'Orion Tekstil',
                'contact_name' => 'Derya Koc',
                'phone' => '0332 500 40 10',
                'email' => 'derya@oriontekstil.test',
                'address' => 'Meram, Konya',
                'tax_number' => '3456789012',
                'notes' => 'Vejetaryen porsiyon talebi olabilir.',
            ],
        ];

        foreach ($companies as $company) {
            ClientCompany::updateOrCreate(
                ['code' => $company['code']],
                [
                    ...$company,
                    'password_hash' => Hash::make('123456'),
                    'active' => true,
                ],
            );
        }
    }
}
