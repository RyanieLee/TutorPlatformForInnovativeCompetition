<script setup lang="ts">
import RoleShell from '../../tutor/shared/RoleShell.vue'
import ParentLayout from '../../../components/ParentLayout.vue'
defineProps<{title:string;role?:string}>()
</script>
<template>
 <RoleShell v-if="role==='tutor'" :title="title" role="tutor"><slot/></RoleShell>
 <ParentLayout v-else :title="title" active="orders"><slot/></ParentLayout>
</template>

