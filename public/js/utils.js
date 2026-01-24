// Show/Hide Loading
const loader = {
    show: () => document.getElementById('globalLoader')?.classList.add('active'),
    hide: () => document.getElementById('globalLoader')?.classList.remove('active')
};

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    toast.style.zIndex = '10000';
    toast.style.minWidth = '300px';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// AJAX Helper with error handling
async function safeAjax(url, options = {}) {
    loader.show();
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error('AJAX Error:', error);
        showToast('Something went wrong. Please try again.', 'danger');
        return { success: false };
    } finally {
        loader.hide();
    }
}
