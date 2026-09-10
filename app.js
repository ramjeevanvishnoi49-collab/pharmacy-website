/* =========================================================
   PHARMACY + GENERAL STORE MANAGEMENT SYSTEM
   public/app.js
   Phase 2A + Phase 2B + Medicine/Store Unit Support
========================================================= */

"use strict";

/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let resetToken = null;
let currentUser = null;

let medicines = [];
let suppliers = [];
let patients = [];

let purchaseItems = [];
let saleItems = [];

/* =========================================================
   API HELPER
========================================================= */

/* OneCompiler frontend से हमेशा production backend को call करें। */
const API_BASE_URL =
    "https://storeraj.oneapp.dev";

/* Localhost HTTP और Production HTTPS दोनों allowed */
if (!/^https?:\/\//i.test(API_BASE_URL)) {
    console.error("Invalid API_BASE_URL:", API_BASE_URL);
}

function getApiUrl(url) {
    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

async function api(url, options = {}) {

    const requestUrl = getApiUrl(url);
    const method = String(options.method || "GET").toUpperCase();

    let response;

    try {
        response = await fetch(requestUrl, {
            ...options,
            method,
            credentials: options.credentials || "include",
            mode: "cors",
            cache: "no-store",
            headers: {
                "Accept": "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers || {})
            }
        });
    } catch (error) {
        console.error(`API Error [${method} ${requestUrl}]:`, error);
        throw new Error(
            `API तक पहुँचा नहीं जा सका: ${method} ${requestUrl}. ` +
            `Backend CORS/preflight, DNS/SSL या server unavailable हो सकता है। ` +
            `Backend में इस frontend origin के लिए Access-Control-Allow-Origin और ` +
            `Access-Control-Allow-Credentials: true आवश्यक हैं। ` +
            (error.message ? `Browser detail: ${error.message}` : "")
        );
    }

    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();
    let data = {};

    if (responseText.trim()) {
        const isJson = /application\/(json|.+\+json)/i.test(contentType);

        if (isJson) {
            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error(`Backend ने invalid JSON भेजा: ${method} ${requestUrl}`);
            }
        } else {
            data = {
                message: responseText
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
            };
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            currentUser = null;
            showLogin();
        }

        const cleanMessage = String(data.message || data.error || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (response.status === 405) {
            throw new Error(
                `405 Method Not Allowed: ${method} ${requestUrl}. ` +
                (cleanMessage || "Backend route इस HTTP method को स्वीकार नहीं कर रहा है।")
            );
        }

        throw new Error(
            cleanMessage ||
            `API request failed: ${response.status} ${response.statusText}: ${method} ${requestUrl}`
        );
    }

    return data;
}

/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}

function show(id) {

    const element = $(id);

    if (element) {
        element.classList.remove("hidden");
    }
}

function hide(id) {

    const element = $(id);

    if (element) {
        element.classList.add("hidden");
    }
}

function setText(id, text) {

    const element = $(id);

    if (element) {
        element.textContent = text ?? "";
    }
}

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function money(value) {

    return "₹" +
        Number(value || 0).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
}

function formatDate(value) {

    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-IN");
}

/* =========================================================
   UNIT HELPERS
========================================================= */

const STORE_UNITS = [
    "Tablet",
    "Capsule",
    "Strip",
    "Bottle",
    "Box",
    "Piece",
    "Pack",
    "Kg",
    "Gram",
    "Litre",
    "Ml"
];

function getItemType(item) {

    return String(
        item.item_type ||
        item.itemType ||
        "medicine"
    ).toLowerCase();
}

function getItemUnit(item) {

    return String(
        item.item_unit ||
        item.itemUnit ||
        item.unit ||
        "Piece"
    );
}

function unitLabel(item) {

    const unit = getItemUnit(item);

    return escapeHtml(unit);
}

/* =========================================================
   SCREEN MANAGEMENT
========================================================= */

function hideAllScreens() {

    [
        "loginScreen",
        "signupScreen",
        "forgotUserIdScreen",
        "forgotPasswordScreen",
        "newPasswordScreen",
        "appScreen"
    ].forEach(hide);
}

function showLogin() {

    hideAllScreens();

    show("loginScreen");

    if ($("loginUsername")) {
        $("loginUsername").focus();
    }
}

function showSignup() {

    hideAllScreens();

    show("signupScreen");
}

function showForgotUserId() {

    hideAllScreens();

    show("forgotUserIdScreen");
}

function showForgotPassword() {

    hideAllScreens();

    show("forgotPasswordScreen");

    hide("otpSection");
    hide("newPasswordScreen");
}

/* =========================================================
   SIGNUP
========================================================= */

async function signup() {

    try {

        const fullName =
            $("signupName").value.trim();

        const username =
            $("signupUsername").value.trim();

        const mobile =
            $("signupMobile").value.trim();

        const password =
            $("signupPassword").value;

        const confirmPassword =
            $("signupConfirm").value;

        if (
            !fullName ||
            !username ||
            !mobile ||
            !password ||
            !confirmPassword
        ) {

            alert("सभी fields भरें।");
            return;
        }

        if (!/^\d{10}$/.test(mobile)) {

            alert("Mobile number 10 digits का होना चाहिए।");
            return;
        }

        if (password.length < 8) {

            alert(
                "Password कम से कम 8 characters का होना चाहिए।"
            );

            return;
        }

        if (password !== confirmPassword) {

            alert(
                "Password और Confirm Password समान नहीं हैं।"
            );

            return;
        }

        const data = await api(
            "/api/auth/signup",
            {
                method: "POST",
                credentials: "omit",
                body: JSON.stringify({
                    fullName,
                    username,
                    mobile,
                    password
                })
            }
        );

        alert(
            data.message ||
            "Account successfully created."
        );

        [
            "signupName",
            "signupUsername",
            "signupMobile",
            "signupPassword",
            "signupConfirm"
        ].forEach(id => {
            if ($(id)) {
                $(id).value = "";
            }
        });

        showLogin();

    } catch (error) {

        alert(error.message);
    }
}

/* =========================================================
   LOGIN
========================================================= */

async function login() {

    try {

        const username =
            $("loginUsername").value.trim();

        const password =
            $("loginPassword").value;

        if (!username || !password) {

            alert(
                "User ID और Password भरें।"
            );

            return;
        }

        const data = await api(
            "/api/auth/login",
            {
                method: "POST",
                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        currentUser = data.user;

        openDashboard(data.user);

    } catch (error) {

        alert(error.message);
    }
}

/* =========================================================
   OPEN DASHBOARD
========================================================= */

function openDashboard(user) {

    currentUser = user;

    hideAllScreens();

    show("appScreen");

    setText(
        "loggedUser",
        `${user.fullName} (${user.username})`
    );

    setText(
        "dashboardUser",
        user.fullName
    );

    setText(
        "dashboardRole",
        user.role
    );

    const adminButton =
        $("adminMenuButton");

    if (adminButton) {

        if (user.role === "admin") {
            adminButton.classList.remove("hidden");
        } else {
            adminButton.classList.add("hidden");
        }
    }

    showSection("dashboardSection");

    loadDashboard();
    loadMedicines();
    loadSuppliers();
    loadPatients();
    loadAlerts();
}

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const data =
            await api("/api/dashboard");

        const dashboard =
            data.dashboard || {};

        setText(
            "totalMedicines",
            dashboard.medicines ?? 0
        );

        setText(
            "totalPatients",
            dashboard.patients ?? 0
        );

        setText(
            "totalSuppliers",
            dashboard.suppliers ?? 0
        );

        setText(
            "lowStockCount",
            dashboard.lowStock ?? 0
        );

        setText(
            "expiryCount",
            dashboard.expiry ?? 0
        );

        setText(
            "todaySales",
            money(dashboard.todaySales || 0)
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );
    }
}

/* =========================================================
   SECTION MANAGEMENT
========================================================= */

function hideAppSections() {

    const sections =
        document.querySelectorAll(".app-section");

    sections.forEach(section => {
        section.classList.add("hidden");
    });
}

function showSection(sectionId) {

    hideAppSections();

    const section = $(sectionId);

    if (section) {

        section.classList.remove("hidden");

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (sectionId === "dashboardSection") {
        loadDashboard();
    }

    if (sectionId === "medicineSection") {
        loadMedicines();
    }

    if (sectionId === "purchaseSection") {
        loadPurchaseData();
    }

    if (sectionId === "salesSection") {
        loadSalesData();
    }

    if (sectionId === "patientsSection") {
        loadPatients();
    }

    if (sectionId === "suppliersSection") {
        loadSuppliers();
    }

    if (sectionId === "reportsSection") {
        loadReports();
    }

    if (sectionId === "adminManagement") {
        loadAdminData();
    }
}

/* =========================================================
   MENU FUNCTIONS
========================================================= */

function showDashboard() {
    showSection("dashboardSection");
}

function showMedicineMaster() {
    showSection("medicineSection");
}

function showPurchase() {
    showSection("purchaseSection");
}

function showSales() {
    showSection("salesSection");
}

function showPatients() {
    showSection("patientsSection");
}

function showSuppliers() {
    showSection("suppliersSection");
}

function showReports() {
    showSection("reportsSection");
}

/* =========================================================
   MEDICINE MASTER
========================================================= */

async function loadMedicines(search = "") {

    try {

        const query =
            search
                ? `?search=${encodeURIComponent(search)}`
                : "";

        const data =
            await api(
                `/api/medicines${query}`
            );

        medicines =
            data.medicines || [];

        renderMedicines();

        fillMedicineSelects();

    } catch (error) {

        console.error(
            "Medicine load:",
            error
        );

        const body =
            $("medicineTableBody");

        if (body) {

            body.innerHTML = `
                <tr>
                    <td colspan="10">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }
    }
}

function renderMedicines() {

    const body =
        $("medicineTableBody");

    if (!body) return;

    if (medicines.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="10">
                    कोई medicine नहीं मिली।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        medicines.map(medicine => {

            const stock =
                Number(
                    medicine.current_stock || 0
                );

            const minimum =
                Number(
                    medicine.minimum_stock || 0
                );

            let status = "OK";

            if (
                medicine.expiry_date &&
                new Date(medicine.expiry_date) <
                new Date()
            ) {

                status = "EXPIRED";

            } else if (
                stock <= minimum
            ) {

                status = "LOW STOCK";
            }

            const type =
                getItemType(medicine);

            const unit =
                getItemUnit(medicine);

            return `
                <tr>

                    <td>
                        ${medicine.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            medicine.medicine_name
                        )}
                        <small>
                            (${escapeHtml(type)})
                        </small>
                    </td>

                    <td>
                        ${escapeHtml(
                            medicine.company_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            medicine.batch_no
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            medicine.expiry_date
                        )}
                    </td>

                    <td>
                        ${stock}
                        ${escapeHtml(unit)}
                    </td>

                    <td>
                        ${money(
                            medicine.purchase_rate
                        )}
                    </td>

                    <td>
                        ${money(
                            medicine.sale_rate
                        )}
                    </td>

                    <td>
                        ${money(
                            medicine.mrp
                        )}
                    </td>

                    <td>
                        <span class="status">
                            ${status}
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
}

/* =========================================================
   SAVE MEDICINE
   IMPORTANT: FIXED PAYLOAD
========================================================= */

async function saveMedicine() {

    try {

        const medicineName =
            $("medicineName").value.trim();

        if (!medicineName) {

            alert("Medicine / Item name भरें।");
            return;
        }

        const itemType =
            $("itemType").value || "medicine";

        const itemUnit =
            $("itemUnit").value || "Piece";

        /*
         * यह वही जगह थी जहाँ आपके पुराने code में
         * payload object missing था।
         */

        const payload = {

            itemType:

                itemType,

            itemUnit:

                itemUnit,

            medicineName:

                medicineName,

            genericName:

                $("genericName").value.trim(),

            companyName:

                $("companyName").value.trim(),

            batchNo:

                $("medicineBatch").value.trim(),

            expiryDate:

                $("medicineExpiry").value ||
                null,

            purchaseRate:

                Number(
                    $("medicinePurchaseRate").value ||
                    0
                ),

            saleRate:

                Number(
                    $("medicineSaleRate").value ||
                    0
                ),

            mrp:

                Number(
                    $("medicineMRP").value ||
                    0
                ),

            gstPercent:

                Number(
                    $("medicineGST").value ||
                    0
                ),

            currentStock:

                Number(
                    $("medicineStock").value ||
                    0
                ),

            minimumStock:

                Number(
                    $("medicineMinimumStock").value ||
                    10
                )
        };

        console.log(
            "Medicine Payload:",
            payload
        );

        const data =
            await api(
                "/api/medicines",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

        alert(
            data.message ||
            "Medicine / Item saved successfully."
        );

        clearMedicineForm();

        await loadMedicines();

        loadDashboard();

    } catch (error) {

        console.error(
            "Save medicine error:",
            error
        );

        alert(error.message);
    }
}

function clearMedicineForm() {

    [
        "medicineName",
        "genericName",
        "companyName",
        "medicineBatch",
        "medicineExpiry",
        "medicinePurchaseRate",
        "medicineSaleRate",
        "medicineMRP",
        "medicineGST",
        "medicineStock",
        "medicineMinimumStock"
    ].forEach(id => {

        if ($(id)) {
            $(id).value = "";
        }
    });

    if ($("itemType")) {
        $("itemType").value = "medicine";
    }

    if ($("itemUnit")) {
        $("itemUnit").value = "Piece";
    }
}

function searchMedicines() {

    const search =
        $("medicineSearch").value.trim() || "";

    loadMedicines(search);
}

/* =========================================================
   SUPPLIERS
========================================================= */

async function loadSuppliers() {

    try {

        const data =
            await api("/api/suppliers");

        suppliers =
            data.suppliers || [];

        renderSuppliers();

        fillSupplierSelect();

    } catch (error) {

        console.error(
            "Supplier load:",
            error
        );
    }
}

function renderSuppliers() {

    const body =
        $("supplierTableBody");

    if (!body) return;

    if (suppliers.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    कोई supplier नहीं मिला।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        suppliers.map(supplier => {

            return `
                <tr>

                    <td>
                        ${supplier.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.supplier_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.contact_person
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.mobile
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.email
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.gst_number
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.address
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}

async function saveSupplier() {

    try {

        const supplierName =
            $("supplierName").value.trim();

        if (!supplierName) {

            alert("Supplier name भरें।");
            return;
        }

        const data =
            await api(
                "/api/suppliers",
                {
                    method: "POST",
                    body: JSON.stringify({

                        supplierName,

                        contactPerson:
                            $("supplierContact").value.trim(),

                        mobile:
                            $("supplierMobile").value.trim(),

                        email:
                            $("supplierEmail").value.trim(),

                        address:
                            $("supplierAddress").value.trim(),

                        gstNumber:
                            $("supplierGST").value.trim()
                    })
                }
            );

        alert(
            data.message ||
            "Supplier saved successfully."
        );

        clearSupplierForm();

        await loadSuppliers();

        loadDashboard();

    } catch (error) {

        alert(error.message);
    }
}

function clearSupplierForm() {

    [
        "supplierName",
        "supplierContact",
        "supplierMobile",
        "supplierEmail",
        "supplierAddress",
        "supplierGST"
    ].forEach(id => {

        if ($(id)) {
            $(id).value = "";
        }
    });
}

/* =========================================================
   PATIENTS
========================================================= */

async function loadPatients(search = "") {

    try {

        const query =
            search
                ? `?search=${encodeURIComponent(search)}`
                : "";

        const data =
            await api(
                `/api/patients${query}`
            );

        patients =
            data.patients || [];

        renderPatients();

        fillPatientSelect();

    } catch (error) {

        console.error(
            "Patient load:",
            error
        );
    }
}

function renderPatients() {

    const body =
        $("patientTableBody");

    if (!body) return;

    if (patients.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    कोई patient नहीं मिला।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        patients.map(patient => {

            return `
                <tr>

                    <td>
                        ${patient.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            patient.patient_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            patient.mobile
                        )}
                    </td>

                    <td>
                        ${patient.age ?? "-"}
                    </td>

                    <td>
                        ${escapeHtml(
                            patient.gender
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            patient.doctor_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            patient.address
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}

async function savePatient() {

    try {

        const patientName =
            $("patientName").value.trim();

        if (!patientName) {

            alert("Patient name भरें।");
            return;
        }

        const data =
            await api(
                "/api/patients",
                {
                    method: "POST",
                    body: JSON.stringify({

                        patientName,

                        mobile:
                            $("patientMobile").value.trim(),

                        age:
                            Number(
                                $("patientAge").value || 0
                            ),

                        gender:
                            $("patientGender").value,

                        address:
                            $("patientAddress").value.trim(),

                        doctorName:
                            $("patientDoctor").value.trim()
                    })
                }
            );

        alert(
            data.message ||
            "Patient saved successfully."
        );

        clearPatientForm();

        await loadPatients();

        loadDashboard();

    } catch (error) {

        alert(error.message);
    }
}

function clearPatientForm() {

    [
        "patientName",
        "patientMobile",
        "patientAge",
        "patientGender",
        "patientAddress",
        "patientDoctor"
    ].forEach(id => {

        if ($(id)) {
            $(id).value = "";
        }
    });
}

function searchPatients() {

    const search =
        $("patientSearch").value.trim() || "";

    loadPatients(search);
}

/* =========================================================
   SELECT DROPDOWNS
========================================================= */

function fillMedicineSelects() {

    const selects =
        document.querySelectorAll(
            ".medicine-select"
        );

    selects.forEach(select => {

        const oldValue =
            select.value;

        select.innerHTML = `
            <option value="">
                Select Medicine / Item
            </option>
        `;

        medicines.forEach(medicine => {

            const option =
                document.createElement("option");

            option.value =
                medicine.id;

            const unit =
                getItemUnit(medicine);

            option.textContent =
                `${medicine.medicine_name} | ${unit} | Stock: ${medicine.current_stock}`;

            select.appendChild(option);
        });

        if (oldValue) {
            select.value = oldValue;
        }
    });
}

function fillSupplierSelect() {

    const select =
        $("purchaseSupplier");

    if (!select) return;

    select.innerHTML = `
        <option value="">
            Select Supplier
        </option>
    `;

    suppliers.forEach(supplier => {

        const option =
            document.createElement("option");

        option.value =
            supplier.id;

        option.textContent =
            supplier.supplier_name;

        select.appendChild(option);
    });
}

function fillPatientSelect() {

    const select =
        $("salePatient");

    if (!select) return;

    select.innerHTML = `
        <option value="">
            Walk-in / Select Patient
        </option>
    `;

    patients.forEach(patient => {

        const option =
            document.createElement("option");

        option.value =
            patient.id;

        option.textContent =
            `${patient.patient_name} - ${patient.mobile || ""}`;

        select.appendChild(option);
    });
}

/* =========================================================
   PURCHASE
========================================================= */

function addPurchaseItem() {

    const medicineId =
        Number(
            $("purchaseMedicine").value
        );

    const quantity =
        Number(
            $("purchaseQuantity").value
        );

    if (!medicineId || quantity <= 0) {

        alert(
            "Medicine / Item और valid quantity चुनें।"
        );

        return;
    }

    const medicine =
        medicines.find(
            m => Number(m.id) === medicineId
        );

    if (!medicine) {

        alert("Medicine / Item नहीं मिला।");
        return;
    }

    const purchaseRate =
        Number(
            $("purchaseRate").value ||
            medicine.purchase_rate ||
            0
        );

    const gstPercent =
        Number(
            $("purchaseGST").value ||
            medicine.gst_percent ||
            0
        );

    const batchNo =
        $("purchaseBatch").value.trim() ||
        medicine.batch_no ||
        "";

    const expiryDate =
        $("purchaseExpiry").value ||
        medicine.expiry_date ||
        "";

    purchaseItems.push({

        medicineId,

        medicineName:
            medicine.medicine_name,

        itemType:
            getItemType(medicine),

        itemUnit:
            getItemUnit(medicine),

        quantity,

        purchaseRate,

        gstPercent,

        batchNo,

        expiryDate
    });

    renderPurchaseItems();

    if ($("purchaseQuantity")) {
        $("purchaseQuantity").value = "";
    }
}

function renderPurchaseItems() {

    const body =
        $("purchaseItemsBody");

    if (!body) return;

    if (purchaseItems.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    Purchase items add करें।
                </td>
            </tr>
        `;

        calculatePurchaseTotal();

        return;
    }

    body.innerHTML =
        purchaseItems.map((item, index) => {

            const subtotal =
                item.quantity *
                item.purchaseRate;

            const gst =
                subtotal *
                item.gstPercent /
                100;

            const total =
                subtotal + gst;

            return `
                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.medicineName
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.batchNo
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.expiryDate
                        )}
                    </td>

                    <td>
                        ${item.quantity}
                        ${escapeHtml(
                            item.itemUnit || "Piece"
                        )}
                    </td>

                    <td>
                        ${money(
                            item.purchaseRate
                        )}
                    </td>

                    <td>
                        ${money(total)}
                    </td>

                    <td>
                        <button
                            type="button"
                            onclick="removePurchaseItem(${index})"
                        >
                            Remove
                        </button>
                    </td>

                </tr>
            `;

        }).join("");

    calculatePurchaseTotal();
}

function removePurchaseItem(index) {

    purchaseItems.splice(
        index,
        1
    );

    renderPurchaseItems();
}

function calculatePurchaseTotal() {

    let subtotal = 0;
    let gst = 0;

    purchaseItems.forEach(item => {

        const line =
            item.quantity *
            item.purchaseRate;

        subtotal += line;

        gst +=
            line *
            item.gstPercent /
            100;
    });

    setText(
        "purchaseSubtotal",
        money(subtotal)
    );

    setText(
        "purchaseGSTTotal",
        money(gst)
    );

    setText(
        "purchaseGrandTotal",
        money(subtotal + gst)
    );
}

async function savePurchase() {

    try {

        if (purchaseItems.length === 0) {

            alert(
                "कम से कम एक purchase item जोड़ें।"
            );

            return;
        }

        const data =
            await api(
                "/api/purchases",
                {
                    method: "POST",
                    body: JSON.stringify({

                        supplierId:
                            Number(
                                $("purchaseSupplier").value
                            ) || null,

                        invoiceNo:
                            $("purchaseInvoice").value.trim() ||
                            undefined,

                        invoiceDate:
                            $("purchaseDate").value ||
                            undefined,

                        items:
                            purchaseItems
                    })
                }
            );

        alert(
            data.message ||
            "Purchase successfully saved."
        );

        purchaseItems = [];

        renderPurchaseItems();

        if ($("purchaseInvoice")) {
            $("purchaseInvoice").value = "";
        }

        await loadMedicines();

        await loadPurchaseData();

        loadDashboard();

        loadAlerts();

    } catch (error) {

        alert(error.message);
    }
}

async function loadPurchaseData() {

    try {

        const data =
            await api(
                "/api/purchases"
            );

        renderPurchaseList(
            data.purchases || []
        );

    } catch (error) {

        console.error(
            "Purchase list:",
            error
        );
    }
}

function renderPurchaseList(purchases) {

    const body =
        $("purchaseTableBody");

    if (!body) return;

    if (purchases.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    कोई purchase नहीं मिली।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        purchases.map(purchase => {

            return `
                <tr>

                    <td>
                        ${purchase.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            purchase.invoice_no
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            purchase.supplier_name
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            purchase.invoice_date
                        )}
                    </td>

                    <td>
                        ${money(
                            purchase.subtotal
                        )}
                    </td>

                    <td>
                        ${money(
                            purchase.gst_amount
                        )}
                    </td>

                    <td>
                        ${money(
                            purchase.grand_total
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}

/* =========================================================
   SALES
========================================================= */

function addSaleItem() {

    const medicineId =
        Number(
            $("saleMedicine").value
        );

    const quantity =
        Number(
            $("saleQuantity").value
        );

    if (!medicineId || quantity <= 0) {

        alert(
            "Medicine / Item और valid quantity चुनें।"
        );

        return;
    }

    const medicine =
        medicines.find(
            m => Number(m.id) === medicineId
        );

    if (!medicine) {

        alert("Medicine / Item नहीं मिला।");
        return;
    }

    const currentStock =
        Number(
            medicine.current_stock || 0
        );

    /*
     * अभी quantity number में है।
     * अगला backend चरण stock को unit-wise support करेगा।
     */

    if (currentStock < quantity) {

        alert(
            `Stock उपलब्ध नहीं है। Available stock: ${currentStock} ${getItemUnit(medicine)}`
        );

        return;
    }

    const saleRate =
        Number(
            $("saleRate").value ||
            medicine.sale_rate ||
            medicine.mrp ||
            0
        );

    const gstPercent =
        Number(
            $("saleGST").value ||
            medicine.gst_percent ||
            0
        );

    const batchNo =
        $("saleBatch").value.trim() ||
        medicine.batch_no ||
        "";

    saleItems.push({

        medicineId,

        medicineName:
            medicine.medicine_name,

        itemType:
            getItemType(medicine),

        itemUnit:
            getItemUnit(medicine),

        quantity,

        saleRate,

        gstPercent,

        batchNo
    });

    renderSaleItems();

    if ($("saleQuantity")) {
        $("saleQuantity").value = "";
    }
}

function renderSaleItems() {

    const body =
        $("saleItemsBody");

    if (!body) return;

    if (saleItems.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    Sale items add करें।
                </td>
            </tr>
        `;

        calculateSaleTotal();

        return;
    }

    body.innerHTML =
        saleItems.map((item, index) => {

            const subtotal =
                item.quantity *
                item.saleRate;

            const gst =
                subtotal *
                item.gstPercent /
                100;

            const total =
                subtotal + gst;

            return `
                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.medicineName
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.batchNo
                        )}
                    </td>

                    <td>
                        ${item.quantity}
                        ${escapeHtml(
                            item.itemUnit || "Piece"
                        )}
                    </td>

                    <td>
                        ${money(
                            item.saleRate
                        )}
                    </td>

                    <td>
                        ${money(total)}
                    </td>

                    <td>
                        <button
                            type="button"
                            onclick="removeSaleItem(${index})"
                        >
                            Remove
                        </button>
                    </td>

                </tr>
            `;

        }).join("");

    calculateSaleTotal();
}

function removeSaleItem(index) {

    saleItems.splice(
        index,
        1
    );

    renderSaleItems();
}

function calculateSaleTotal() {

    let subtotal = 0;
    let gst = 0;

    saleItems.forEach(item => {

        const line =
            item.quantity *
            item.saleRate;

        subtotal += line;

        gst +=
            line *
            item.gstPercent /
            100;
    });

    const discount =
        Number(
            $("saleDiscount").value ||
            0
        );

    const total =
        subtotal +
        gst -
        discount;

    setText(
        "saleSubtotal",
        money(subtotal)
    );

    setText(
        "saleGSTTotal",
        money(gst)
    );

    setText(
        "saleDiscountTotal",
        money(discount)
    );

    setText(
        "saleGrandTotal",
        money(
            Math.max(total, 0)
        )
    );
}

async function saveSale() {

    try {

        if (saleItems.length === 0) {

            alert(
                "कम से कम एक sale item जोड़ें।"
            );

            return;
        }

        const discount =
            Number(
                $("saleDiscount").value ||
                0
            );

        const data =
            await api(
                "/api/sales",
                {
                    method: "POST",
                    body: JSON.stringify({

                        invoiceNo:
                            $("saleInvoice").value.trim() ||
                            undefined,

                        patientId:
                            Number(
                                $("salePatient").value
                            ) || null,

                        discount,

                        items:
                            saleItems
                    })
                }
            );

        alert(
            data.message ||
            "Sale successfully saved."
        );

        saleItems = [];

        renderSaleItems();

        if ($("saleInvoice")) {
            $("saleInvoice").value = "";
        }

        if ($("saleDiscount")) {
            $("saleDiscount").value = "0";
        }

        await loadMedicines();

        await loadSalesData();

        loadDashboard();

        loadAlerts();

    } catch (error) {

        alert(error.message);
    }
}

async function loadSalesData() {

    try {

        const data =
            await api(
                "/api/sales"
            );

        renderSalesList(
            data.sales || []
        );

    } catch (error) {

        console.error(
            "Sales list:",
            error
        );

        const body =
            $("salesTableBody");

        if (body) {

            body.innerHTML = `
                <tr>
                    <td colspan="7">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }
    }
}

function renderSalesList(sales) {

    const body =
        $("salesTableBody");

    if (!body) return;

    if (sales.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    कोई sale नहीं मिली।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        sales.map(sale => {

            return `
                <tr>

                    <td>
                        ${sale.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            sale.invoice_no
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            sale.patient_name ||
                            "Walk-in"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            sale.sale_date
                        )}
                    </td>

                    <td>
                        ${money(
                            sale.subtotal
                        )}
                    </td>

                    <td>
                        ${money(
                            sale.discount
                        )}
                    </td>

                    <td>
                        ${money(
                            sale.grand_total
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}

/* =========================================================
   REPORTS
========================================================= */

async function loadReports() {

    try {

        await Promise.all([
            loadSalesReport(),
            loadPurchaseReport(),
            loadStockReport(),
            loadLowStockReport(),
            loadExpiryReport()
        ]);

    } catch (error) {

        console.error(
            "Reports error:",
            error
        );
    }
}

function getReportDates() {

    const from =
        $("reportFrom").value ||
        new Date().toISOString().slice(0, 10);

    const to =
        $("reportTo").value ||
        from;

    return {
        from,
        to
    };
}

async function loadSalesReport() {

    try {

        const {
            from,
            to
        } = getReportDates();

        const data =
            await api(
                `/api/reports/sales?from=${from}&to=${to}`
            );

        const report =
            data.report || {};

        setText(
            "reportSalesInvoices",
            report.invoices ?? 0
        );

        setText(
            "reportSalesTotal",
            money(report.total)
        );

    } catch (error) {

        console.error(error);
    }
}

async function loadPurchaseReport() {

    try {

        const {
            from,
            to
        } = getReportDates();

        const data =
            await api(
                `/api/reports/purchases?from=${from}&to=${to}`
            );

        const report =
            data.report || {};

        setText(
            "reportPurchaseInvoices",
            report.invoices ?? 0
        );

        setText(
            "reportPurchaseTotal",
            money(report.total)
        );

    } catch (error) {

        console.error(error);
    }
}

async function loadStockReport() {

    try {

        const data =
            await api(
                "/api/reports/stock"
            );

        renderStockReport(
            data.medicines || []
        );

    } catch (error) {

        console.error(error);
    }
}

function renderStockReport(items) {

    const body =
        $("stockReportBody");

    if (!body) return;

    if (items.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="7">
                    कोई stock record नहीं मिला।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        items.map(item => {

            return `
                <tr>

                    <td>
                        ${item.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.medicine_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.batch_no
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.expiry_date
                        )}
                    </td>

                    <td>
                        ${item.current_stock}
                    </td>

                    <td>
                        ${item.minimum_stock}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.stock_status
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}

async function loadLowStockReport() {

    try {

        const data =
            await api(
                "/api/reports/low-stock"
            );

        setText(
            "lowStockReportCount",
            data.count ?? 0
        );

        renderLowStock(
            data.medicines || []
        );

    } catch (error) {

        console.error(error);
    }
}

function renderLowStock(items) {

    const body =
        $("lowStockBody");

    if (!body) return;

    if (items.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="4">
                    Low stock नहीं है।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        items.map(item => {

            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            item.medicine_name
                        )}
                    </td>

                    <td>
                        ${item.current_stock}
                    </td>

                    <td>
                        ${item.minimum_stock}
                    </td>

                    <td>
                        LOW STOCK
                    </td>

                </tr>
            `;

        }).join("");
}

async function loadExpiryReport() {

    try {

        const data =
            await api(
                "/api/reports/expiry?days=90"
            );

        setText(
            "expiryReportCount",
            data.count ?? 0
        );

        renderExpiry(
            data.medicines || []
        );

    } catch (error) {

        console.error(error);
    }
}

function renderExpiry(items) {

    const body =
        $("expiryBody");

    if (!body) return;

    if (items.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="4">
                    अगले 90 दिनों में expiry नहीं है।
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        items.map(item => {

            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            item.medicine_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.batch_no
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.expiry_date
                        )}
                    </td>

                    <td>
                        ${item.current_stock}
                    </td>

                </tr>
            `;

        }).join("");
}

/* =========================================================
   ALERTS
========================================================= */

async function loadAlerts() {

    try {

        const [
            lowStockData,
            expiryData
        ] = await Promise.all([

            api(
                "/api/reports/low-stock"
            ),

            api(
                "/api/reports/expiry?days=90"
            )
        ]);

        setText(
            "lowStockCount",
            lowStockData.count || 0
        );

        setText(
            "expiryCount",
            expiryData.count || 0
        );

    } catch (error) {

        console.error(
            "Alert error:",
            error
        );
    }
}

/* =========================================================
   ADMIN MANAGEMENT
========================================================= */

function showAdminManagement() {

    if (
        !currentUser ||
        currentUser.role !== "admin"
    ) {

        alert(
            "Admin access required."
        );

        return;
    }

    showSection(
        "adminManagement"
    );
}

async function loadAdminData() {

    if (
        !currentUser ||
        currentUser.role !== "admin"
    ) {
        return;
    }

    try {

        const [
            usersData,
            logsData
        ] = await Promise.all([

            api(
                "/api/admin/users"
            ),

            api(
                "/api/admin/login-logs"
            )
        ]);

        renderAdminUsers(
            usersData.users || []
        );

        renderAdminLogs(
            logsData.logs || []
        );

    } catch (error) {

        console.error(
            "Admin error:",
            error
        );

        showAdminMessage(
            error.message
        );
    }
}

function renderAdminUsers(users) {

    const body =
        $("adminUsersBody");

    if (!body) return;

    body.innerHTML =
        users.map(user => {

            return `
                <tr>

                    <td>
                        ${user.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            user.full_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            user.username
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            user.mobile
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            user.role
                        )}
                    </td>

                    <td>
                        ${user.is_active
                            ? "Active"
                            : "Inactive"}
                    </td>

                    <td>

                        <button
                            type="button"
                            onclick="updateUserRole(${user.id}, 'admin')"
                        >
                            Admin
                        </button>

                        <button
                            type="button"
                            onclick="updateUserRole(${user.id}, 'pharmacist')"
                        >
                            Pharmacist
                        </button>

                        <button
                            type="button"
                            onclick="toggleUserStatus(${user.id}, ${!user.is_active})"
                        >
                            ${user.is_active
                                ? "Disable"
                                : "Enable"}
                        </button>

                    </td>

                </tr>
            `;

        }).join("");
}

async function updateUserRole(
    userId,
    role
) {

    try {

        await api(
            `/api/admin/users/${userId}/role`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    role
                })
            }
        );

        showAdminMessage(
            "User role updated successfully."
        );

        loadAdminData();

    } catch (error) {

        showAdminMessage(
            error.message
        );
    }
}

async function toggleUserStatus(
    userId,
    isActive
) {

    try {

        await api(
            `/api/admin/users/${userId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    isActive
                })
            }
        );

        showAdminMessage(
            "User status updated successfully."
        );

        loadAdminData();

    } catch (error) {

        showAdminMessage(
            error.message
        );
    }
}

function showAdminMessage(message) {

    setText(
        "adminMessage",
        message
    );
}

function renderAdminLogs(logs) {

    const body =
        $("adminLogsBody");

    if (!body) return;

    body.innerHTML =
        logs.map(log => {

            return `
                <tr>

                    <td>
                        ${log.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.username
                        )}
                    </td>

                    <td>
                        ${log.success
                            ? "Success"
                            : "Failed"}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.ip_address
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            log.created_at
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}

/* =========================================================
   FORGOT USER ID
========================================================= */

async function forgotUserId() {

    try {

        const mobile =
            $("forgotUserMobile").value.trim();

        if (!/^\d{10}$/.test(mobile)) {

            alert(
                "10 digit mobile number डालें।"
            );

            return;
        }

        const data =
            await api(
                "/api/auth/forgot-user-id",
                {
                    method: "POST",
                    body: JSON.stringify({
                        mobile
                    })
                }
            );

        const result =
            $("userIdResult");

        if (result) {

            result.innerHTML =
                `
                आपका User ID है:
                <strong>
                    ${escapeHtml(
                        data.username
                    )}
                </strong>
                `;
        }

    } catch (error) {

        alert(error.message);
    }
}

/* =========================================================
   REQUEST OTP
========================================================= */

async function requestOTP() {

    try {

        const username =
            $("resetUsername").value.trim();

        const mobile =
            $("resetMobile").value.trim();

        if (
            !username ||
            !/^\d{10}$/.test(mobile)
        ) {

            alert(
                "Valid User ID और 10 digit mobile number डालें।"
            );

            return;
        }

        const data =
            await api(
                "/api/auth/request-reset",
                {
                    method: "POST",
                    body: JSON.stringify({
                        username,
                        mobile
                    })
                }
            );

        show("otpSection");

        if (data.developmentOtp) {

            alert(
                `Development OTP: ${data.developmentOtp}`
            );

        } else {

            alert(
                data.message ||
                "OTP भेज दिया गया है।"
            );
        }

    } catch (error) {

        alert(error.message);
    }
}

/* =========================================================
   VERIFY OTP
========================================================= */

async function verifyOTP() {

    try {

        const username =
            $("resetUsername").value.trim();

        const mobile =
            $("resetMobile").value.trim();

        const otp =
            $("resetOTP").value.trim();

        if (!otp) {

            alert("OTP डालें।");
            return;
        }

        const data =
            await api(
                "/api/auth/verify-otp",
                {
                    method: "POST",
                    body: JSON.stringify({
                        username,
                        mobile,
                        otp
                    })
                }
            );

        resetToken =
            data.resetToken;

        hideAllScreens();

        show("newPasswordScreen");

    } catch (error) {

        alert(error.message);
    }
}

/* =========================================================
   RESET PASSWORD
========================================================= */

async function resetPassword() {

    try {

        if (!resetToken) {

            alert(
                "Password reset session expired."
            );

            showForgotPassword();

            return;
        }

        const newPassword =
            $("newPassword").value;

        const confirmPassword =
            $("newPasswordConfirm").value;

        if (
            !newPassword ||
            !confirmPassword
        ) {

            alert(
                "New password और confirm password भरें।"
            );

            return;
        }

        if (newPassword.length < 8) {

            alert(
                "Password कम से कम 8 characters का होना चाहिए।"
            );

            return;
        }

        if (newPassword !== confirmPassword) {

            alert(
                "Passwords समान नहीं हैं।"
            );

            return;
        }

        const data =
            await api(
                "/api/auth/reset-password",
                {
                    method: "POST",
                    body: JSON.stringify({

                        resetToken,

                        newPassword
                    })
                }
            );

        alert(
            data.message ||
            "Password changed successfully."
        );

        resetToken = null;

        if ($("newPassword")) {
            $("newPassword").value = "";
        }

        if ($("newPasswordConfirm")) {
            $("newPasswordConfirm").value = "";
        }

        showLogin();

    } catch (error) {

        alert(error.message);
    }
}

/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await api(
            "/api/auth/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        currentUser = null;

        medicines = [];
        suppliers = [];
        patients = [];

        purchaseItems = [];
        saleItems = [];

        showLogin();
    }
}

/* =========================================================
   CHECK SESSION
========================================================= */

async function checkSession() {

    try {

        const data =
            await api(
                "/api/auth/me"
            );

        if (
            data.success &&
            data.user
        ) {

            currentUser =
                data.user;

            openDashboard(
                data.user
            );

            return;
        }

    } catch (error) {

        console.log(
            "No active session."
        );
    }

    showLogin();
}

/* =========================================================
   AUTO CALCULATE TOTAL
========================================================= */

document.addEventListener(
    "input",
    function (event) {

        if (
            event.target.id ===
            "saleDiscount"
        ) {
            calculateSaleTotal();
        }

        if (
            event.target.id ===
            "purchaseRate"
        ) {
            calculatePurchaseTotal();
        }

        if (
            event.target.id ===
            "purchaseGST"
        ) {
            calculatePurchaseTotal();
        }

        if (
            event.target.id ===
            "saleRate"
        ) {
            calculateSaleTotal();
        }

        if (
            event.target.id ===
            "saleGST"
        ) {
            calculateSaleTotal();
        }

        if (
            event.target.id ===
            "saleQuantity"
        ) {
            updateSaleQuantityInfo();
        }
    }
);

/* =========================================================
   MEDICINE AUTO-FILL
========================================================= */

function medicineSelectedForPurchase() {

    const id =
        Number(
            $("purchaseMedicine").value
        );

    const medicine =
        medicines.find(
            m => Number(m.id) === id
        );

    if (!medicine) return;

    if ($("purchaseRate")) {

        $("purchaseRate").value =
            medicine.purchase_rate || "";
    }

    if ($("purchaseGST")) {

        $("purchaseGST").value =
            medicine.gst_percent || "";
    }

    if ($("purchaseBatch")) {

        $("purchaseBatch").value =
            medicine.batch_no || "";
    }

    if ($("purchaseExpiry")) {

        $("purchaseExpiry").value =
            medicine.expiry_date
                ? String(
                    medicine.expiry_date
                ).slice(0, 10)
                : "";
    }
}

function medicineSelectedForSale() {

    const id =
        Number(
            $("saleMedicine").value
        );

    const medicine =
        medicines.find(
            m => Number(m.id) === id
        );

    if (!medicine) return;

    if ($("saleRate")) {

        $("saleRate").value =
            medicine.sale_rate ||
            medicine.mrp ||
            "";
    }

    if ($("saleGST")) {

        $("saleGST").value =
            medicine.gst_percent || "";
    }

    if ($("saleBatch")) {

        $("saleBatch").value =
            medicine.batch_no || "";
    }

    setText(
        "saleAvailableStock",
        `Available Stock: ${medicine.current_stock} ${getItemUnit(medicine)}`
    );

    /*
     * यदि HTML में unit display के लिए element बनाया गया है
     * तो यहाँ उसका value भी दिख जाएगा।
     */

    setText(
        "saleSelectedUnit",
        getItemUnit(medicine)
    );
}

function updateSaleQuantityInfo() {

    const id =
        Number(
            $("saleMedicine").value
        );

    const medicine =
        medicines.find(
            m => Number(m.id) === id
        );

    if (!medicine) return;

    const quantity =
        Number(
            $("saleQuantity").value || 0
        );

    setText(
        "saleQuantityInfo",
        quantity > 0
            ? `Sale Quantity: ${quantity} ${getItemUnit(medicine)}`
            : ""
    );
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Pharmacy + General Store Management System loaded."
        );

        const purchaseMedicine =
            $("purchaseMedicine");

        if (purchaseMedicine) {

            purchaseMedicine.addEventListener(
                "change",
                medicineSelectedForPurchase
            );
        }

        const saleMedicine =
            $("saleMedicine");

        if (saleMedicine) {

            saleMedicine.addEventListener(
                "change",
                medicineSelectedForSale
            );
        }

        const purchaseItemsBody =
            $("purchaseItemsBody");

        if (purchaseItemsBody) {
            renderPurchaseItems();
        }

        const saleItemsBody =
            $("saleItemsBody");

        if (saleItemsBody) {
            renderSaleItems();
        }

        checkSession();
    }
);

/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
========================================================= */

window.login = login;
window.logout = logout;

window.signup = signup;

window.showLogin = showLogin;
window.showSignup = showSignup;
window.showForgotUserId = showForgotUserId;
window.showForgotPassword = showForgotPassword;

window.forgotUserId = forgotUserId;
window.requestOTP = requestOTP;
window.verifyOTP = verifyOTP;
window.resetPassword = resetPassword;

window.showDashboard = showDashboard;
window.showMedicineMaster = showMedicineMaster;
window.showPurchase = showPurchase;
window.showSales = showSales;
window.showPatients = showPatients;
window.showSuppliers = showSuppliers;
window.showReports = showReports;

window.showAdminManagement =
    showAdminManagement;

window.saveMedicine =
    saveMedicine;

window.clearMedicineForm =
    clearMedicineForm;

window.searchMedicines =
    searchMedicines;

window.saveSupplier =
    saveSupplier;

window.clearSupplierForm =
    clearSupplierForm;

window.savePatient =
    savePatient;

window.clearPatientForm =
    clearPatientForm;

window.searchPatients =
    searchPatients;

window.addPurchaseItem =
    addPurchaseItem;

window.removePurchaseItem =
    removePurchaseItem;

window.savePurchase =
    savePurchase;

window.addSaleItem =
    addSaleItem;

window.removeSaleItem =
    removeSaleItem;

window.saveSale =
    saveSale;

window.updateUserRole =
    updateUserRole;

window.toggleUserStatus =
    toggleUserStatus;

window.loadReports =
    loadReports;

console.log(
    "✅ Pharmacy + General Store JavaScript ready"
);
