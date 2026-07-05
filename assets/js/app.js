
// Konfigurasi API dan Midtrans
const API_BASE_URL = 'https://cuplizz-space.my.id/api';
const MIDTRANS_CLIENT_KEY = 'Mid-client-JhctP4gCknrcRODU'; // TODO: Update with real Midtrans client key if needed


/**
 * ────────────────────────────────────────────────────────
 * 1. CORE API & AUTHENTICATION
 * ────────────────────────────────────────────────────────
 */
async function apiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
    const token = localStorage.getItem('api_token');
    
    const headers = {
        'Accept': 'application/json'
    };

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method: method,
        headers: headers
    };

    if (data) {
        options.body = isFormData ? data : JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        // Handle no content
        if (response.status === 204) return true;

        const result = await response.json();
        
        if (response.status === 401 || response.status === 403) {
            console.error('Unauthorized access');
            // Jika 401 dan bukan saat login, paksa logout
            if (response.status === 401 && !endpoint.includes('/login')) {
                forceLogout();
            }
            throw new Error(result.message || 'Sesi berakhir atau akses ditolak.');
        }

        if (!response.ok) {
            throw new Error(result.message || 'Terjadi kesalahan pada server');
        }

        return result;
    } catch (error) {
        throw error;
    }
}

function forceLogout() {
    localStorage.removeItem('api_token');
    localStorage.removeItem('user_data');
    window.location.href = '../../login.html';
}

function confirmLogout() {
    Swal.fire({
        title: 'Konfirmasi Logout',
        text: "Anda yakin ingin keluar dari akun ini?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d2691e',
        cancelButtonColor: '#666',
        confirmButtonText: 'Ya, Logout!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            logout();
        }
    });
}

async function logout(callApi = true) {
    if (callApi && localStorage.getItem('api_token')) {
        try { await apiRequest('/auth/logout', 'POST'); } catch (e) {}
    }
    forceLogout();
}

async function login(email, password) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.style.display = 'none';
    
    try {
        const response = await apiRequest('/auth/login', 'POST', { email, password });
        
        if (response.success && response.token) {
            localStorage.setItem('api_token', response.token);
            localStorage.setItem('user_data', JSON.stringify(response.user));
            window.location.href = 'index.html';
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = error.message || 'Email atau password salah!';
        } else {
            alert(error.message);
        }
    }
}

function getUserData() {
    const data = localStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
}

function checkAuthStatus() {
    const user = getUserData();
    const authLink = document.getElementById('auth-link');
    const logoutBtn = document.getElementById('logout-btn');
    const userGreeting = document.getElementById('user-greeting');
    const adminLink = document.getElementById('admin-link');
    const ordersLink = document.getElementById('orders-link');

    if (user) {
        if (authLink) authLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userGreeting) {
            userGreeting.style.display = 'inline-block';
            userGreeting.textContent = `Halo, ${user.name}`;
        }
        if (user.role === 'admin' && adminLink) adminLink.style.display = 'inline-block';
        if (user.role === 'user' && ordersLink) ordersLink.style.display = 'inline-block';
    } else {
        if (authLink) authLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userGreeting) userGreeting.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (ordersLink) ordersLink.style.display = 'none';
    }
    
    updateCartCount();
}

// Role Guard
function requireAuth(role = null) {
    const user = getUserData();
    if (!user) {
        window.location.href = '../../login.html';
        return false;
    }
    if (role && user.role !== role) {
        Swal.fire({
            icon: 'error',
            title: 'Akses Ditolak!',
            text: 'Anda tidak memiliki izin untuk halaman ini.',
            confirmButtonColor: '#d2691e'
        }).then(() => {
            window.location.href = '../../index.html';
        });
        return false;
    }
    return true;
}

/**
 * ────────────────────────────────────────────────────────
 * 2. CART (KERANJANG BELANJA)
 * ────────────────────────────────────────────────────────
 */
function getCart() {
    const cart = localStorage.getItem('coffee_cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('coffee_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? 'inline-block' : 'none';
    }
}

function addToCart(product) {
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            qty: 1,
            image: product.image_url
        });
    }
    
    saveCart(cart);
    
    // Gunakan Toast SweetAlert agar tidak mengganggu (muncul di pojok)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });
    
    Toast.fire({
        icon: 'success',
        title: `${product.name} ditambahkan ke keranjang!`
    });
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

/**
 * ────────────────────────────────────────────────────────
 * 3. PUBLIC FRONTEND FETCHERS
 * ────────────────────────────────────────────────────────
 */
async function fetchProductsPublic() {
    const container = document.getElementById('products-container');
    const loading = document.getElementById('loading');
    const catContainer = document.getElementById('categories-container');
    
    try {
        // Ambil produk dan kategori secara paralel
        const [prodRes, catRes] = await Promise.all([
            apiRequest('/products'),
            apiRequest('/categories')
        ]);
        
        loading.style.display = 'none';
        
        // Render Categories
        if (catContainer && catRes.data) {
            let catHtml = `<button class="btn-filter active" onclick="filterProducts('all')">Semua Menu</button>`;
            catRes.data.forEach(c => {
                catHtml += `<button class="btn-filter" onclick="filterProducts(${c.id})">${c.name}</button>`;
            });
            catContainer.innerHTML = catHtml;
        }
        
        if (prodRes.data && prodRes.data.length > 0) {
            window.availableProducts = prodRes.data;
            renderProductsUI(prodRes.data);
        } else {
            container.innerHTML = '<p class="text-center">Belum ada menu.</p>';
        }
    } catch (error) {
        loading.style.display = 'none';
        container.innerHTML = `<p class="text-error text-center">Gagal memuat menu: ${error.message}</p>`;
    }
}

function renderProductsUI(products) {
    const container = document.getElementById('products-container');
    const user = getUserData();
    const isAdmin = user && user.role === 'admin';
    let html = '';
    
    products.forEach(product => {
        const img = product.image_url ? product.image_url : 'https://via.placeholder.com/300x200?text=☕';

        let actionBtn = '';
        if (!isAdmin) {
            actionBtn = `<button class="btn-add-cart" onclick='addSpecificToCart(${product.id})'>
                            + Tambah ke Keranjang
                        </button>`;
        }

        html += `
            <div class="product-card">
                <img src="${img}" alt="${product.name}" class="product-img" loading="lazy">
                <div class="product-info">
                    <span class="category-badge">${product.category?.name || 'Uncategorized'}</span>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description || 'Tidak ada deskripsi.'}</p>
                    <p class="product-price">Rp ${formatRupiah(product.price)}</p>
                    ${actionBtn}
                </div>
            </div>
        `;
    });
    
    if(products.length === 0) {
        html = '<p class="text-center" style="grid-column: 1 / -1;">Tidak ada menu di kategori ini.</p>';
    }
    
    container.innerHTML = html;
}

function filterProducts(categoryId) {
    // Update tombol active
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (categoryId === 'all') {
        renderProductsUI(window.availableProducts);
    } else {
        const filtered = window.availableProducts.filter(p => p.category && p.category.id === categoryId);
        renderProductsUI(filtered);
    }
}

function addSpecificToCart(id) {
    const p = window.availableProducts.find(x => x.id === id);
    if(p) addToCart(p);
}

/**
 * ────────────────────────────────────────────────────────
 * 4. ADMIN FETCHERS
 * ────────────────────────────────────────────────────────
 */
function buildAdminSidebar() {
    const path = window.location.pathname;
    const active = (page) => path.includes(page) ? 'active' : '';

    return `
        <div class="admin-sidebar">
            <div class="sidebar-brand">☕ Cuplizz Admin</div>

            <a href="index.html" class="${active('admin/index') || (path.endsWith('/admin/') ? 'active' : '')}">
                📊 Dashboard
            </a>
            <a href="products.html" class="${active('products')}">
                📦 Data Produk
            </a>
            <a href="categories.html" class="${active('categories')}">
                🏷️ Data Kategori
            </a>
            <a href="orders.html" class="${active('orders')}">
                🧾 Data Pesanan
            </a>

            <div class="sidebar-footer">
                <a href="../index.html" style="font-size:12.5px; color:#57534e;">
                    ← Website Utama
                </a>
                <a href="#" class="danger" onclick="confirmLogout(); return false;" style="margin-top:4px;">
                    🚪 Logout
                </a>
            </div>
        </div>
    `;
}
