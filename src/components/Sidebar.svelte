<script lang="ts">
    export let activePage = '';
</script>

<aside class="sidebar">
    <div class="sidebar-header">
        STUDENT DB
    </div>
    <nav class="sidebar-nav">
        <a href="/" class="nav-link {activePage === '' ? 'active' : ''}">
            <i class="fas fa-home"></i>
            Dashboard
        </a>
        <a href="/students" class="nav-link {activePage === 'students' ? 'active' : ''}">
            <i class="fas fa-users"></i>
            Students
        </a>
        <a href="/settings" class="nav-link {activePage === 'settings' ? 'active' : ''}">
            <i class="fas fa-cog"></i>
            Settings
        </a>
    </nav>
</aside>

<div class="lg:ml-64">
    <slot />
</div>


