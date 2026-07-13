/**
 * ======================================================
 * الملف: components/charts/charts.js
 * الوصف: مكون المخططات البيانية (Charts)
 *         يدير إنشاء وتحديث وتدمير المخططات بأنواع مختلفة
 *         (خطية، شريطية، دائرية، مساحية، عمودية، إلخ)
 *         باستخدام مكتبة Chart.js مع دعم للتخصيص،
 *         التحميل غير المتزامن، والتفاعل
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { formatCurrency, formatNumber, formatDate } from '../../utils/helpers.js';
import { showLoader, hideLoader } from '../loader/loader.js';
import { toast } from '../toast/toast.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const CHART_TYPES = {
    LINE: 'line',
    BAR: 'bar',
    PIE: 'pie',
    DOUGHNUT: 'doughnut',
    RADAR: 'radar',
    POLAR_AREA: 'polarArea',
    SCATTER: 'scatter',
    BUBBLE: 'bubble',
    MIXED: 'mixed',
};

const DEFAULT_COLORS = [
    '#2d7ff9', '#36b37e', '#ffab00', '#ff5630', '#6554c0',
    '#00b8d4', '#ff8b00', '#00b8a0', '#ff6b6b', '#4a9eff',
    '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c', '#3498db',
];

const DEFAULT_OPTIONS = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                    family: "'Inter', 'Segoe UI', sans-serif",
                    size: 12,
                },
            },
        },
        tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: {
                family: "'Inter', 'Segoe UI', sans-serif",
                size: 13,
            },
            bodyFont: {
                family: "'Inter', 'Segoe UI', sans-serif",
                size: 12,
            },
            cornerRadius: 6,
            padding: 10,
        },
    },
};

// ============================================
//  2.  تحميل مكتبة Chart.js
// ============================================

let ChartJS = null;
let chartLoaded = false;
let loadPromise = null;

/**
 * تحميل مكتبة Chart.js من CDN
 * @returns {Promise} Promise عند تحميل المكتبة
 */
export function loadChartLibrary() {
    if (chartLoaded && ChartJS) {
        return Promise.resolve(ChartJS);
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = new Promise((resolve, reject) => {
        // التحقق من وجود Chart.js في النافذة
        if (window.Chart) {
            ChartJS = window.Chart;
            chartLoaded = true;
            resolve(ChartJS);
            return;
        }

        // تحميل المكتبة من CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.async = true;
        script.onload = () => {
            if (window.Chart) {
                ChartJS = window.Chart;
                chartLoaded = true;
                resolve(ChartJS);
            } else {
                reject(new Error('فشل تحميل مكتبة Chart.js'));
            }
        };
        script.onerror = () => {
            reject(new Error('فشل تحميل مكتبة Chart.js من CDN'));
        };
        document.head.appendChild(script);

        // مهلة في حالة عدم التحميل
        setTimeout(() => {
            if (!chartLoaded) {
                reject(new Error('انتهت مهلة تحميل مكتبة Chart.js'));
            }
        }, 10000);
    });

    return loadPromise;
}

// ============================================
//  3.  فئة المخطط الرئيسية
// ============================================

class ChartComponent {
    constructor(options = {}) {
        this.id = options.id || `chart-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.type = options.type || CHART_TYPES.LINE;
        this.data = options.data || null;
        this.labels = options.labels || [];
        this.datasets = options.datasets || [];
        this.options = options.options || {};
        this.height = options.height || 300;
        this.width = options.width || '100%';
        this.loading = false;
        this.autoUpdate = options.autoUpdate || false;
        this.updateInterval = options.updateInterval || 5000;
        this.className = options.className || '';
        this.style = options.style || {};
        this.animation = options.animation !== undefined ? options.animation : true;

        // الأحداث
        this.onClick = options.onClick || null;
        this.onHover = options.onHover || null;
        this.onLoad = options.onLoad || null;
        this.onUpdate = options.onUpdate || null;

        // الحالة الداخلية
        this.element = null;
        this.canvas = null;
        this.chartInstance = null;
        this._updateTimer = null;
        this._loaderId = null;
        this._isDestroyed = false;

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  4.  دوال العرض (Render)
    // ============================================

    /**
     * عرض المخطط بالكامل
     */
    async render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Chart container not found');
            return this;
        }

        try {
            // تحميل مكتبة Chart.js
            await loadChartLibrary();
        } catch (error) {
            console.error('Failed to load Chart.js:', error);
            this.showError('فشل تحميل مكتبة المخططات. يرجى التحقق من الاتصال بالإنترنت.');
            return this;
        }

        // إنشاء عنصر المخطط
        this.element = createElement('div', {
            className: `chart-container ${this.className}`,
            style: {
                position: 'relative',
                width: this.width,
                height: typeof this.height === 'number' ? `${this.height}px` : this.height,
                ...this.style,
            },
            id: this.id,
        });

        // إنشاء عنصر canvas
        this.canvas = createElement('canvas', {
            id: `chart-canvas-${this.id}`,
            style: {
                width: '100%',
                height: '100%',
            },
        });
        this.element.appendChild(this.canvas);

        container.appendChild(this.element);

        // إنشاء المخطط
        await this.createChart();

        // تفعيل التحديث التلقائي
        if (this.autoUpdate) {
            this.startAutoUpdate();
        }

        return this;
    }

    /**
     * إنشاء المخطط
     */
    async createChart() {
        if (!this.canvas || !ChartJS) {
            return;
        }

        // تدمير المخطط القديم إذا كان موجوداً
        this.destroyChart();

        // إعداد البيانات
        const chartData = this.prepareData();

        // إعداد الخيارات
        const chartOptions = this.prepareOptions();

        try {
            this.chartInstance = new ChartJS(this.canvas.getContext('2d'), {
                type: this.type,
                data: chartData,
                options: chartOptions,
            });

            // إضافة مستمعات الأحداث
            if (this.onClick) {
                this.chartInstance.canvas.addEventListener('click', (e) => {
                    const points = this.chartInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                    if (points && points.length > 0) {
                        this.onClick(points[0], e);
                    }
                });
            }

            if (this.onHover) {
                this.chartInstance.canvas.addEventListener('mousemove', (e) => {
                    const points = this.chartInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                    if (points && points.length > 0) {
                        this.onHover(points[0], e);
                    }
                });
            }

            if (this.onLoad) {
                this.onLoad(this.chartInstance);
            }

        } catch (error) {
            console.error('Failed to create chart:', error);
            this.showError('حدث خطأ أثناء إنشاء المخطط');
        }
    }

    /**
     * إعداد البيانات
     */
    prepareData() {
        let data = this.data || {};

        // إذا تم توفير labels و datasets مباشرة
        if (this.labels.length > 0 || this.datasets.length > 0) {
            data = {
                labels: this.labels,
                datasets: this.datasets,
            };
        }

        // إذا كان data كائناً يحتوي على labels و datasets
        if (data.labels && data.datasets) {
            return data;
        }

        // إذا كان data مصفوفة أرقام (مخطط خطي بسيط)
        if (Array.isArray(data)) {
            return {
                labels: data.map((_, i) => i + 1),
                datasets: [{
                    label: 'البيانات',
                    data: data,
                    backgroundColor: DEFAULT_COLORS[0],
                    borderColor: DEFAULT_COLORS[0],
                    fill: false,
                }],
            };
        }

        // إذا كان data كائن بمفاتيح وقيم
        if (typeof data === 'object' && !Array.isArray(data)) {
            const keys = Object.keys(data);
            return {
                labels: keys,
                datasets: [{
                    label: 'القيم',
                    data: keys.map(key => data[key]),
                    backgroundColor: DEFAULT_COLORS.slice(0, keys.length),
                }],
            };
        }

        // بيانات افتراضية
        return {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'المبيعات',
                data: [65, 59, 80, 81, 56, 55],
                backgroundColor: DEFAULT_COLORS[0],
                borderColor: DEFAULT_COLORS[0],
                fill: false,
            }],
        };
    }

    /**
     * إعداد الخيارات
     */
    prepareOptions() {
        const baseOptions = {
            ...DEFAULT_OPTIONS,
            responsive: true,
            maintainAspectRatio: true,
            animation: this.animation ? undefined : { duration: 0 },
        };

        // دمج الخيارات المخصصة
        const mergedOptions = this.deepMerge(baseOptions, this.options);

        // تخصيص التسميات حسب النوع
        if (this.type === CHART_TYPES.PIE || this.type === CHART_TYPES.DOUGHNUT) {
            mergedOptions.plugins = mergedOptions.plugins || {};
            mergedOptions.plugins.legend = mergedOptions.plugins.legend || {};
            mergedOptions.plugins.legend.position = 'bottom';
        }

        // تخصيص المحاور حسب النوع
        if (this.type === CHART_TYPES.LINE || this.type === CHART_TYPES.BAR || this.type === CHART_TYPES.RADAR) {
            mergedOptions.scales = mergedOptions.scales || {};
            mergedOptions.scales.y = mergedOptions.scales.y || {};
            mergedOptions.scales.y.beginAtZero = true;
        }

        return mergedOptions;
    }

    /**
     * دمج عميق لكائنين
     */
    deepMerge(target, source) {
        const result = { ...target };
        if (!source) return result;

        Object.keys(source).forEach(key => {
            const sourceVal = source[key];
            const targetVal = result[key];
            if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
                result[key] = this.deepMerge(targetVal || {}, sourceVal);
            } else {
                result[key] = sourceVal;
            }
        });

        return result;
    }

    // ============================================
    //  5.  دوال تحديث البيانات
    // ============================================

    /**
     * تحديث بيانات المخطط
     */
    update(data = null, labels = null) {
        if (!this.chartInstance) {
            console.warn('Chart instance not available');
            return this;
        }

        if (data) {
            this.data = data;
        }
        if (labels) {
            this.labels = labels;
        }

        const chartData = this.prepareData();

        // تحديث التسميات
        if (chartData.labels) {
            this.chartInstance.data.labels = chartData.labels;
        }

        // تحديث مجموعات البيانات
        if (chartData.datasets) {
            chartData.datasets.forEach((dataset, index) => {
                if (this.chartInstance.data.datasets[index]) {
                    Object.assign(this.chartInstance.data.datasets[index], dataset);
                } else {
                    this.chartInstance.data.datasets.push(dataset);
                }
            });
            // إزالة المجموعات الزائدة
            while (this.chartInstance.data.datasets.length > chartData.datasets.length) {
                this.chartInstance.data.datasets.pop();
            }
        }

        this.chartInstance.update();

        if (this.onUpdate) {
            this.onUpdate(this.chartInstance);
        }

        return this;
    }

    /**
     * تحديث خيارات المخطط
     */
    updateOptions(options) {
        if (!this.chartInstance) {
            console.warn('Chart instance not available');
            return this;
        }

        this.options = this.deepMerge(this.options, options);
        const chartOptions = this.prepareOptions();
        this.chartInstance.options = chartOptions;
        this.chartInstance.update();

        return this;
    }

    /**
     * إضافة مجموعة بيانات جديدة
     */
    addDataset(dataset) {
        if (!this.chartInstance) {
            console.warn('Chart instance not available');
            return this;
        }

        this.datasets.push(dataset);
        this.chartInstance.data.datasets.push(dataset);
        this.chartInstance.update();

        return this;
    }

    /**
     * إزالة مجموعة بيانات
     */
    removeDataset(index) {
        if (!this.chartInstance) {
            console.warn('Chart instance not available');
            return this;
        }

        if (index >= 0 && index < this.chartInstance.data.datasets.length) {
            this.datasets.splice(index, 1);
            this.chartInstance.data.datasets.splice(index, 1);
            this.chartInstance.update();
        }

        return this;
    }

    // ============================================
    //  6.  دوال التحميل غير المتزامن
    // ============================================

    /**
     * تحميل البيانات من مصدر خارجي
     */
    async loadData(fetchFn, params = {}) {
        this.showLoading(true);
        try {
            const result = await fetchFn(params);
            const data = result.data || result;
            const labels = result.labels || null;
            this.update(data, labels);
            if (this.onLoad) {
                this.onLoad(this.chartInstance, result);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل بيانات المخطط: ' + error.message);
            console.error('Chart load error:', error);
        } finally {
            this.showLoading(false);
        }
        return this;
    }

    /**
     * إظهار/إخفاء حالة التحميل
     */
    showLoading(loading) {
        this.loading = loading;
        if (loading) {
            this._loaderId = showLoader({
                target: this.element || this.container,
                message: 'جاري تحميل المخطط...',
                overlay: true,
                overlayColor: 'rgba(255,255,255,0.6)',
            });
        } else {
            if (this._loaderId) {
                hideLoader(this._loaderId);
                this._loaderId = null;
            }
        }
        return this;
    }

    // ============================================
    //  7.  دوال التحديث التلقائي
    // ============================================

    /**
     * بدء التحديث التلقائي
     */
    startAutoUpdate() {
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
        }

        if (!this.autoUpdate) return;

        this._updateTimer = setInterval(() => {
            if (!this._isDestroyed && this.chartInstance) {
                // يمكن تخصيص هذه الدالة في حالة التحديث التلقائي
                this.update();
            }
        }, this.updateInterval);

        return this;
    }

    /**
     * إيقاف التحديث التلقائي
     */
    stopAutoUpdate() {
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
            this._updateTimer = null;
        }
        return this;
    }

    // ============================================
    //  8.  دوال المساعدة
    // ============================================

    /**
     * عرض رسالة خطأ في مكان المخطط
     */
    showError(message) {
        if (this.element) {
            const errorEl = createElement('div', {
                className: 'chart-error',
                textContent: message,
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--font-sm)',
                    padding: 'var(--spacing-4)',
                    textAlign: 'center',
                },
            });
            // إزالة المحتوى القديم وإضافة الخطأ
            this.element.innerHTML = '';
            this.element.appendChild(errorEl);
        }
    }

    /**
     * الحصول على صورة المخطط كـ Base64
     */
    toBase64(type = 'image/png', quality = 1) {
        if (!this.canvas) return null;
        return this.canvas.toDataURL(type, quality);
    }

    /**
     * تنزيل المخطط كصورة
     */
    downloadImage(filename = `chart-${Date.now()}.png`, type = 'image/png') {
        const dataUrl = this.toBase64(type);
        if (!dataUrl) {
            toast.error('لا يمكن تنزيل المخطط');
            return;
        }

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.click();
        toast.success('تم تنزيل المخطط بنجاح');
    }

    // ============================================
    //  9.  دوال التنظيف والتدمير
    // ============================================

    /**
     * تدمير المخطط
     */
    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    /**
     * تدمير المكون بالكامل
     */
    destroy() {
        this._isDestroyed = true;
        this.stopAutoUpdate();

        if (this._loaderId) {
            hideLoader(this._loaderId);
            this._loaderId = null;
        }

        this.destroyChart();

        if (this.element) {
            removeElement(this.element);
            this.element = null;
        }

        this.canvas = null;
        console.log('Chart destroyed:', this.id);
        return this;
    }

    /**
     * تحديث المخطط (إعادة عرض)
     */
    refresh() {
        if (this.chartInstance) {
            this.chartInstance.update();
        } else {
            this.createChart();
        }
        return this;
    }

    // ============================================
    //  10.  دوال مساعدة للاستعلام
    // ============================================

    /**
     * الحصول على كائن Chart.js
     */
    getInstance() {
        return this.chartInstance;
    }

    /**
     * الحصول على العنصر DOM
     */
    getElement() {
        return this.element;
    }

    /**
     * الحصول على المعرف
     */
    getId() {
        return this.id;
    }

    /**
     * الحصول على نوع المخطط
     */
    getType() {
        return this.type;
    }
}

// ============================================
//  11.  دوال مساعدة لإنشاء المخططات
// ============================================

/**
 * إنشاء مخطط جديد
 */
export function createChart(options = {}) {
    return new ChartComponent(options);
}

/**
 * إنشاء مخطط خطي
 */
export function createLineChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.LINE,
        data,
        ...options,
    });
}

/**
 * إنشاء مخطط شريطي
 */
export function createBarChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.BAR,
        data,
        ...options,
    });
}

/**
 * إنشاء مخطط دائري
 */
export function createPieChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.PIE,
        data,
        ...options,
    });
}

/**
 * إنشاء مخطط دونات
 */
export function createDoughnutChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.DOUGHNUT,
        data,
        ...options,
    });
}

/**
 * إنشاء مخطط رادار
 */
export function createRadarChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.RADAR,
        data,
        ...options,
    });
}

/**
 * إنشاء مخطط قطبي
 */
export function createPolarAreaChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.POLAR_AREA,
        data,
        ...options,
    });
}

/**
 * إنشاء مخطط مبعثر
 */
export function createScatterChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.SCATTER,
        data,
        ...options,
    });
}

/**
 * إنشاء مخطط مختلط
 */
export function createMixedChart(container, data, options = {}) {
    return new ChartComponent({
        container,
        type: CHART_TYPES.MIXED,
        data,
        ...options,
    });
}

// ============================================
//  12.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام المخططات
 */
export function initCharts() {
    // تحميل المكتبة مسبقاً
    loadChartLibrary().catch(() => {
        console.warn('Failed to preload Chart.js library');
    });

    // إضافة أنماط إضافية
    if (!document.getElementById('charts-style')) {
        const style = document.createElement('style');
        style.id = 'charts-style';
        style.textContent = `
            .chart-container {
                position: relative;
                background: var(--bg-card);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-color);
                padding: var(--spacing-4);
                box-shadow: var(--shadow-sm);
                transition: all var(--transition-normal);
            }
            .chart-container:hover {
                box-shadow: var(--shadow-md);
            }
            .chart-container canvas {
                max-width: 100%;
                max-height: 100%;
            }
            .chart-error {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 200px;
                color: var(--text-tertiary);
                font-size: var(--font-sm);
                padding: var(--spacing-4);
                text-align: center;
            }
            .dark .chart-container {
                border-color: var(--border-color);
            }
            @media (max-width: 768px) {
                .chart-container {
                    padding: var(--spacing-2);
                }
                .chart-container canvas {
                    height: 200px !important;
                }
            }
            @media (max-width: 480px) {
                .chart-container {
                    padding: var(--spacing-1);
                    border-radius: var(--radius-sm);
                }
                .chart-container canvas {
                    height: 150px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    console.log('Charts component initialized successfully');
}

/**
 * تنظيف نظام المخططات
 */
export function destroyCharts() {
    const style = document.getElementById('charts-style');
    if (style) {
        style.remove();
    }
    // تدمير جميع المخططات النشطة
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(el => {
        const chart = el._chartInstance;
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    console.log('Charts component destroyed');
}

// ============================================
//  13.  API عام للمكون
// ============================================

export const charts = {
    Chart: ChartComponent,
    create: createChart,
    line: createLineChart,
    bar: createBarChart,
    pie: createPieChart,
    doughnut: createDoughnutChart,
    radar: createRadarChart,
    polarArea: createPolarAreaChart,
    scatter: createScatterChart,
    mixed: createMixedChart,
    init: initCharts,
    destroy: destroyCharts,
    loadLibrary: loadChartLibrary,
    TYPES: CHART_TYPES,
    COLORS: DEFAULT_COLORS,
};

// تصدير افتراضي
export default charts;

// ============================================
//  14.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  15.  نهاية الملف
// ============================================
