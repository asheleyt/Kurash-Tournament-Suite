<!--
    Kurash Tournament Suite

    File: refereeController.vue
    Description: Wrapper single-file component for the referee controller page.
    Loads the external template, setup script, and scoped stylesheet.

    Part of the Kurash Tournament Suite desktop application.

    Copyright (c) 2026 Kurash Tournament Suite.
    All rights reserved.
-->
<template src="./refereeController.template.html"></template>

<script setup lang="ts" src="./refereeController.setup.ts"></script>

<script lang="ts">
import RefereeDisplayManagementPanel from '@/components/Referee/RefereeDisplayManagementPanel.vue';
import RefereeConnectionPanel from '@/components/Referee/RefereeConnectionPanel.vue';
import RefereeFallbackRecoveryPanel from '@/components/Referee/RefereeFallbackRecoveryPanel.vue';
import KeyboardSettings from '@/components/Referee/KeyboardSettings.vue';
import PenaltyButton from '@/components/Referee/PenaltyButton.vue';
import ScoreButton from '@/components/Referee/ScoreButton.vue';
import ChevronDownIcon from '@/components/Referee/Icons/ChevronDownIcon.vue';
import CoffeeIcon from '@/components/Referee/Icons/CoffeeIcon.vue';
import CrossIcon from '@/components/Referee/Icons/CrossIcon.vue';
import PauseIcon from '@/components/Referee/Icons/PauseIcon.vue';
import PlayIcon from '@/components/Referee/Icons/PlayIcon.vue';
import RotateCcwIcon from '@/components/Referee/Icons/RotateCcwIcon.vue';
import SettingsIcon from '@/components/Referee/Icons/SettingsIcon.vue';
import TrophyIconSimple from '@/components/Referee/Icons/TrophyIconSimple.vue';
import Undo2Icon from '@/components/Referee/Icons/Undo2Icon.vue';
import { Clock, Timer, RefreshCw, Upload, CheckCircle2, XCircle, User, Hash, Flag, Search, Power } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
</script>

<style scoped src="./refereeController.css"></style>
