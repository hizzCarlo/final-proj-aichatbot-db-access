<!-- SummaryModal.svelte -->
<script lang="ts">
    import { fade, scale } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    import Icon from '@iconify/svelte';
    import type { SummaryData } from '$lib/types';

    export let show = false;
    export let summaryData: SummaryData;
    export let isLoading = false;

    let enrollmentChart: Chart | null = null;
    let performanceChart: Chart | null = null;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch('close');
    }

    function clearSummary() {
        dispatch('clear');
    }

    function createCharts() {
        if (!summaryData) return;

        const enrollmentCtx = (document.getElementById('enrollmentChart') as HTMLCanvasElement)?.getContext('2d');
        const performanceCtx = (document.getElementById('performanceChart') as HTMLCanvasElement)?.getContext('2d');

        if (enrollmentChart) enrollmentChart.destroy();
        if (performanceChart) performanceChart.destroy();

        if (enrollmentCtx) {
            enrollmentChart = new Chart(enrollmentCtx, {
                type: 'line',
                data: summaryData.charts.enrollment,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Enrollment Trends and Predictions'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Students'
                            }
                        }
                    }
                }
            });
        }

        if (performanceCtx) {
            performanceChart = new Chart(performanceCtx, {
                type: 'line',
                data: summaryData.charts.performance,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Academic Performance Trends'
                        }
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: 4,
                            title: {
                                display: true,
                                text: 'GPA'
                            }
                        }
                    }
                }
            });
        }
    }

    $: if (show && summaryData) {
        requestAnimationFrame(createCharts);
    }

    $: formattedDate = summaryData?.timestamp ? new Date(summaryData.timestamp).toLocaleString() : '';
</script>

{#if show}
<div 
    class="modal-backdrop"
    role="button"
    tabindex="0"
    on:click={close}
    on:keydown={(e) => e.key === 'Escape' && close()}
    transition:fade={{ duration: 200 }}
>
    <div class="modal-container" on:click|stopPropagation>
        <div class="modal-header">
            <h2>Student Data Summary</h2>
            <div class="header-actions">
                {#if summaryData}
                    <button class="btn btn-secondary" on:click={clearSummary}>
                        <i class="fas fa-redo"></i>
                        Clear & Regenerate
                    </button>
                {/if}
                <button class="close-button" on:click={close}>
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="modal-content">
            {#if isLoading}
                <div class="loading-state" transition:scale>
                    <div class="loading-spinner">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                    <p>Analyzing student data...</p>
                </div>
            {:else if summaryData}
                <div class="summary-sections">
                    <div class="section">
                        <h3>Overview</h3>
                        <div class="overview-content">
                            {#each summaryData.summary.split('###').filter(Boolean) as section}
                                <div class="section-content">
                                    {#if section.includes('*')}
                                        <ul>
                                            {#each section.split('*').filter(Boolean) as point}
                                                <li>{point}</li>
                                            {/each}
                                        </ul>
                                    {:else}
                                        <p>{section}</p>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>

                    <div class="section">
                        <h3>Enrollment Trends</h3>
                        <div class="chart-container">
                            <canvas id="enrollmentChart"></canvas>
                        </div>
                    </div>

                    <div class="section">
                        <h3>Performance Analysis</h3>
                        <div class="chart-container">
                            <canvas id="performanceChart"></canvas>
                        </div>
                    </div>

                    <div class="section">
                        <h3>AI Insights & Recommendations</h3>
                        <div class="insights-content">
                            {#each summaryData.insights.split('###').filter(Boolean) as section}
                                <div class="section-content">
                                    {#if section.includes('*')}
                                        <ul>
                                            {#each section.split('*').filter(Boolean) as point}
                                                <li>{point}</li>
                                            {/each}
                                        </ul>
                                    {:else}
                                        <p>{section}</p>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {:else}
                <div class="no-data">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No summary data available</p>
                </div>
            {/if}
        </div>
    </div>
</div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-container {
        background-color: var(--card-background);
        border-radius: 1rem;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
        color: var(--text-primary);
    }

    .close-button {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        transition: background-color 0.2s;
    }

    .close-button:hover {
        background-color: var(--hover-color);
    }

    .modal-content {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
        color: var(--text-primary);
    }

    .summary-sections {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .section h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
    }

    .overview-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .section-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        color: var(--text-primary);
    }

    .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .data-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background-color: var(--background-color);
        border-radius: 0.5rem;
    }

    .data-item strong {
        color: var(--text-primary);
        font-weight: 600;
    }

    ul {
        list-style-type: none;
        padding-left: 0;
        margin: 0;
    }

    li {
        position: relative;
        padding-left: 1.5rem;
        margin-bottom: 0.75rem;
        line-height: 1.6;
        color: var(--text-primary);
    }

    li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: var(--primary-color);
    }

    .no-data {
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        gap: 2rem;
        color: var(--text-primary);
    }

    .loading-spinner {
        display: flex;
        gap: 0.5rem;
    }

    .dot {
        width: 0.75rem;
        height: 0.75rem;
        background-color: var(--primary-color);
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
        0%, 80%, 100% { 
            transform: scale(0);
        }
        40% { 
            transform: scale(1);
        }
    }

    .chart-container {
        width: 100%;
        height: 300px;
        margin-top: 1rem;
        background-color: var(--card-background);
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--border-color);
    }

    .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-secondary {
        background-color: var(--background-color);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }

    .btn-secondary:hover {
        background-color: var(--hover-color);
    }
</style> 