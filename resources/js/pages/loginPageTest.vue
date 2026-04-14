<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const form = useForm({
    username: '',
    password: '',
    remember: false,
});

const submit = () => {
    console.log('Login attempt', form);
    // form.post(route('login')); // efficient placeholder
};
</script>

<template>
    <Head title="Login Test" />

    <div class="min-h-screen w-full flex items-center justify-center bg-[#020817] text-white font-sans selection:bg-amber-500 selection:text-black">
        <!-- Main Container -->
        <div class="w-full max-w-md p-8 rounded-xl border border-slate-800 bg-[#0b1121] shadow-2xl relative overflow-hidden">
            
            <!-- Header Section -->
            <div class="text-center mb-10 space-y-2">
                <h1 class="text-3xl font-serif font-bold text-amber-500 tracking-wider uppercase drop-shadow-sm">
                    Kurash Team
                </h1>
                <p class="text-slate-400 text-sm tracking-wide">
                    Welcome back! Please access your account.
                </p>
            </div>

            <!-- Login Form -->
            <form @submit.prevent="submit" class="space-y-6">
                
                <!-- Username Field -->
                <div class="space-y-2">
                    <Label for="username" class="text-slate-300 text-xs uppercase tracking-wider font-semibold">
                        Username
                    </Label>
                    <Input
                        id="username"
                        v-model="form.username"
                        type="text"
                        required
                        autofocus
                        class="bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500/20 h-12"
                        placeholder="Enter your username"
                    />
                </div>

                <!-- Password Field -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <Label for="password" class="text-slate-300 text-xs uppercase tracking-wider font-semibold">
                            Password
                        </Label>
                        <Link
                            href="#" 
                            class="text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium"
                        >
                            Forgot Password?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        v-model="form.password"
                        type="password"
                        required
                        class="bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500/20 h-12"
                        placeholder="••••••••"
                    />
                </div>

                <!-- Remember Me & Actions -->
                <div class="flex items-center space-x-2 pt-2">
                    <Checkbox 
                        id="remember" 
                        v-model:checked="form.remember"
                        class="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black data-[state=checked]:border-amber-500"
                    />
                    <Label
                        for="remember"
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-400"
                    >
                        Remember me
                    </Label>
                </div>

                <!-- Submit Button -->
                <Button
                    type="submit"
                    class="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider h-12 text-sm transition-all duration-300 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.5)]"
                    :disabled="form.processing"
                >
                    Log In
                </Button>

                <!-- Footer / Sign Up -->
                <div class="mt-6 text-center text-sm text-slate-500">
                    Don't have an account? 
                    <Link href="#" class="text-amber-500 hover:text-amber-400 font-semibold transition-colors">
                        Sign up
                    </Link>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
/* Custom overrides if Tailwind isn't enough */
</style>
