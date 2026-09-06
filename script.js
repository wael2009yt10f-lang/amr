/* =====================================================
   CONFIGURATION
===================================================== */

const OVERPASS_API =
    "https://overpass-api.de/api/interpreter";


const SEARCH_RADIUS = 5000;


/* =====================================================
   VARIABLES
===================================================== */

let map;

let userMarker = null;

let markers = [];

let allShops = [];

let currentCategory = "all";

let currentLocation = null;


/* =====================================================
   CATEGORY MAP
===================================================== */

const categoryNames = {

    restaurant: "مطعم",

    sweets: "حلويات",

    market: "سوبر ماركت",

    shopping: "ملابس",

    cafe: "كافيه",

    pharmacy: "صيدلية",

    bakery: "مخبز",

    butcher: "جزارة",

    greengrocer: "خضار وفاكهة",

    electronics: "إلكترونيات",

    mobile_phone: "موبايلات",

    shoes: "أحذية",

    jewelry: "مجوهرات",

    furniture: "أثاث",

    cosmetics: "مستحضرات تجميل",

    books: "كتب",

    sports: "أدوات رياضية",

    supermarket: "سوبر ماركت",

    convenience: "متجر",

    department_store: "متجر كبير",

    hairdresser: "حلاق / كوافير",

    other: "مكان"

};


/* =====================================================
   INITIALIZE MAP
===================================================== */

function initializeMap() {

    map = L.map("map").setView(
        [30.5877, 31.5020],
        13
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

    document
        .getElementById("mapLoading")
        .classList.remove("hidden");

}


function hideLoading() {

    document
        .getElementById("mapLoading")
        .classList.add("hidden");

}


/* =====================================================
   CLEAR MARKERS
===================================================== */

function clearMarkers() {

    markers.forEach(
        marker => {

            map.removeLayer(marker);

        }
    );

    markers = [];

}


/* =====================================================
   CREATE MAP MARKER
===================================================== */

function addShopMarker(shop) {

    const marker =
        L.marker([
            shop.lat,
            shop.lng
        ]).addTo(map);


    let phoneHTML = "";

    if (shop.phone) {

        phoneHTML = `

            <a
                href="tel:${shop.phone}"
                class="popup-button"
            >

                <i class="fa-solid fa-phone"></i>

                اتصال

            </a>

        `;

    }


    const directionsURL =
        `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;


    const popupHTML = `

        <div class="custom-popup">

            <div class="popup-title">

                ${escapeHTML(shop.name)}

            </div>


            <div class="popup-category">

                ${escapeHTML(shop.categoryName)}

            </div>


            ${
                shop.address
                    ? `
                        <div class="popup-address">

                            <i class="fa-solid fa-location-dot"></i>

                            ${escapeHTML(shop.address)}

                        </div>
                    `
                    : ""
            }


            ${
                shop.phone
                    ? `
                        <div class="popup-phone">

                            <i class="fa-solid fa-phone"></i>

                            ${escapeHTML(shop.phone)}

                        </div>
                    `
                    : ""
            }


            <div class="popup-buttons">

                ${phoneHTML}


                <a
                    href="${directionsURL}"
                    target="_blank"
                    rel="noopener"
                    class="popup-button secondary"
                >

                    <i class="fa-solid fa-route"></i>

                    الاتجاهات

                </a>

            </div>

        </div>

    `;


    marker.bindPopup(popupHTML);


    markers.push(marker);

}


/* =====================================================
   SHOW MARKERS
===================================================== */

function showMarkers(shopList) {

    clearMarkers();

    shopList.forEach(
        shop => addShopMarker(shop)
    );

}


/* =====================================================
   OVERPASS QUERY
===================================================== */

async function fetchNearbyPlaces(
    lat,
    lng
) {

    const query = `

        [out:json][timeout:30];

        (

            nwr(
                around:${SEARCH_RADIUS},
                ${lat},
                ${lng}
            )["shop"];

            nwr(
                around:${SEARCH_RADIUS},
                ${lat},
                ${lng}
            )["amenity"="restaurant"];

            nwr(
                around:${SEARCH_RADIUS},
                ${lat},
                ${lng}
            )["amenity"="cafe"];

            nwr(
                around:${SEARCH_RADIUS},
                ${lat},
                ${lng}
            )["amenity"="pharmacy"];

        );

        out center tags;

    `;


    const url =
        OVERPASS_API +
        "?data=" +
        encodeURIComponent(query);


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Overpass API error"
        );

    }


    const data =
        await response.json();


    return data.elements || [];

}


/* =====================================================
   CONVERT OSM DATA
===================================================== */

function convertPlaces(elements) {

    const result = [];


    elements.forEach(
        element => {

            const tags =
                element.tags || {};


            let lat =
                element.lat;

            let lng =
                element.lon;


            if (
                lat === undefined &&
                element.center
            ) {

                lat =
                    element.center.lat;

                lng =
                    element.center.lon;

            }


            if (
                lat === undefined ||
                lng === undefined
            ) {

                return;

            }


            const name =
                tags["name:ar"] ||
                tags.name ||
                tags["name:en"] ||
                "مكان بدون اسم";


            let category =
                "other";


            let categoryName =
                "مكان";


            /* SHOP */

            if (tags.shop) {

                category =
                    normalizeShopCategory(
                        tags.shop
                    );

                categoryName =
                    categoryNames[
                        category
                    ] || "محل";

            }


            /* RESTAURANT */

            if (
                tags.amenity ===
                "restaurant"
            ) {

                category =
                    "restaurant";

                categoryName =
                    "مطعم";

            }


            /* CAFE */

            if (
                tags.amenity ===
                "cafe"
            ) {

                category =
                    "cafe";

                categoryName =
                    "كافيه";

            }


            /* PHARMACY */

            if (
                tags.amenity ===
                "pharmacy"
            ) {

                category =
                    "pharmacy";

                categoryName =
                    "صيدلية";

            }


            const phone =
                tags.phone ||
                tags["contact:phone"] ||
                tags["contact:mobile"] ||
                "";


            const website =
                tags.website ||
                tags["contact:website"] ||
                "";


            const address =
                buildAddress(tags);


            const openingHours =
                tags.opening_hours ||
                "";


            result.push({

                id:
                    `${element.type}-${element.id}`,

                name,

                category,

                categoryName,

                lat,

                lng,

                phone,

                website,

                address,

                openingHours,

                image:
                    tags.image ||
                    null

            });

        }
    );


    return removeDuplicates(result);

}


/* =====================================================
   NORMALIZE SHOP CATEGORIES
===================================================== */

function normalizeShopCategory(
    shopType
) {

    const types = {

        supermarket: "market",

        convenience: "market",

        grocery: "market",

        clothes: "shopping",

        fashion: "shopping",

        confectionery: "sweets",

        bakery: "bakery",

        butcher: "butcher",

        greengrocer: "greengrocer",

        electronics: "electronics",

        mobile_phone: "mobile_phone",

        shoes: "shoes",

        jewelry: "jewelry",

        furniture: "furniture",

        cosmetics: "cosmetics",

        books: "books",

        sports: "sports",

        department_store:
            "department_store",

        hairdresser:
            "hairdresser"

    };


    return (
        types[shopType] ||
        shopType ||
        "other"
    );

}


/* =====================================================
   ADDRESS
===================================================== */

function buildAddress(tags) {

    const parts = [];


    if (tags["addr:street"]) {

        parts.push(
            tags["addr:street"]
        );

    }


    if (tags["addr:suburb"]) {

        parts.push(
            tags["addr:suburb"]
        );

    }


    if (tags["addr:city"]) {

        parts.push(
            tags["addr:city"]
        );

    }


    if (parts.length === 0) {

        return "";

    }


    return parts.join(" - ");

}


/* =====================================================
   REMOVE DUPLICATES
===================================================== */

function removeDuplicates(
    places
) {

    const seen =
        new Set();


    return places.filter(
        place => {

            const key =
                `${place.name}-${place.lat.toFixed(5)}-${place.lng.toFixed(5)}`;


            if (seen.has(key)) {

                return false;

            }


            seen.add(key);

            return true;

        }
    );

}


/* =====================================================
   RENDER SHOPS
===================================================== */

function renderShops(
    shopList
) {

    const grid =
        document.getElementById(
            "shopsGrid"
        );


    const count =
        document.getElementById(
            "resultsCount"
        );


    count.textContent =
        shopList.length;


    grid.innerHTML = "";


    if (shopList.length === 0) {

        grid.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-store-slash"></i>

                <h3>
                    مفيش أماكن لحد دلوقتي
                </h3>

                <p>
                    جرب البحث في منطقة أخرى
                    أو اختار تصنيف مختلف.
                </p>

            </div>

        `;

        return;

    }


    shopList
        .slice(0, 30)
        .forEach(
            shop => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "shop-card";


                const phoneButton =
                    shop.phone
                        ? `
                            <a
                                href="tel:${shop.phone}"
                            >
                                <i class="fa-solid fa-phone"></i>
                                اتصال
                            </a>
                          `
                        : "";


                const directions =
                    `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;


                card.innerHTML = `

                    <div class="shop-image">

                        ${
                            shop.image
                                ? `
                                    <img
                                        src="${escapeAttribute(shop.image)}"
                                        alt="${escapeAttribute(shop.name)}"
                                        loading="lazy"
                                    >
                                  `
                                : `
                                    <div class="shop-image-placeholder">

                                        <i class="fa-solid fa-store"></i>

                                    </div>
                                  `
                        }


                        <span class="shop-category">

                            ${escapeHTML(
                                shop.categoryName
                            )}

                        </span>

                    </div>


                    <div class="shop-info">


                        <h3>

                            ${escapeHTML(
                                shop.name
                            )}

                        </h3>


                        ${
                            shop.address
                                ? `
                                    <div class="shop-address">

                                        <i class="fa-solid fa-location-dot"></i>

                                        <span>
                                            ${escapeHTML(
                                                shop.address
                                            )}
                                        </span>

                                    </div>
                                  `
                                : ""
                        }


                        ${
                            shop.phone
                                ? `
                                    <div class="shop-address">

                                        <i class="fa-solid fa-phone"></i>

                                        <span>
                                            ${escapeHTML(
                                                shop.phone
                                            )}
                                        </span>

                                    </div>
                                  `
                                : ""
                        }


                        <div class="shop-meta">

                            <span class="rating">

                                <i class="fa-solid fa-location-dot"></i>

                                مكان قريب

                            </span>

                            <span class="distance">

                                ${calculateDistanceText(shop)}

                            </span>

                        </div>


                        <div class="shop-actions">

                            ${phoneButton}


                            <a
                                href="${directions}"
                                target="_blank"
                                rel="noopener"
                            >

                                <i class="fa-solid fa-route"></i>

                                الاتجاهات

                            </a>

                        </div>


                    </div>

                `;


                grid.appendChild(card);

            }
        );

}


/* =====================================================
   DISTANCE
===================================================== */

function calculateDistanceText(
    shop
) {

    if (!currentLocation) {

        return "";

    }


    const distance =
        calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            shop.lat,
            shop.lng
        );


    if (distance < 1) {

        return `${Math.round(distance * 1000)} متر`;

    }


    return `${distance.toFixed(1)} كم`;

}


/* =====================================================
   DISTANCE CALCULATION
===================================================== */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R =
        6371;


    const dLat =
        toRadians(lat2 - lat1);

    const dLon =
        toRadians(lon2 - lon1);


    const a =

        Math.sin(dLat / 2) *
        Math.sin(dLat / 2)

        +

        Math.cos(
            toRadians(lat1)
        )

        *

        Math.cos(
            toRadians(lat2)
        )

        *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}


function toRadians(
    degrees
) {

    return degrees *
        Math.PI /
        180;

}


/* =====================================================
   FILTER SHOPS
===================================================== */

function filterShops() {

    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .trim()
            .toLowerCase();


    const filtered =
        allShops.filter(
            shop => {

                const matchesCategory =

                    currentCategory ===
                    "all"

                    ||

                    shop.category ===
                    currentCategory;


                const text =

                    `${shop.name}
                     ${shop.categoryName}
                     ${shop.address}`
                        .toLowerCase();


                const matchesSearch =

                    search === "" ||

                    text.includes(search);


                return (
                    matchesCategory &&
                    matchesSearch
                );

            }
        );


    renderShops(filtered);

    showMarkers(filtered);

}


/* =====================================================
   LOAD LOCATION
===================================================== */

async function loadUserLocation() {

    if (
        !navigator.geolocation
    ) {

        alert(
            "المتصفح لا يدعم تحديد الموقع."
        );

        return;

    }


    const button =
        document.getElementById(
            "locationBtn"
        );


    button.disabled =
        true;


    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        جاري تحديد الموقع...

    `;


    showLoading();


    navigator.geolocation.getCurrentPosition(

        async position => {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;


            currentLocation = {
                lat,
                lng
            };


            map.setView(
                [lat, lng],
                15
            );


            if (userMarker) {

                map.removeLayer(
                    userMarker
                );

            }


            userMarker =
                L.marker(
                    [lat, lng]
                )
                .addTo(map)
                .bindPopup(
                    "أنت هنا"
                );


            document
                .getElementById(
                    "currentLocationText"
                )
                .textContent =
                "تم تحديد موقعك الحالي";


            try {

                const elements =
                    await fetchNearbyPlaces(
                        lat,
                        lng
                    );


                allShops =
                    convertPlaces(
                        elements
                    );


                filterShops();


            } catch (error) {

                console.error(error);

                alert(
                    "حدثت مشكلة أثناء تحميل الأماكن."
                );

            }


            hideLoading();


            button.disabled =
                false;


            button.innerHTML = `

                <i class="fa-solid fa-location-crosshairs"></i>

                تم تحديد موقعي

            `;

        },


        error => {

            console.error(error);


            hideLoading();


            button.disabled =
                false;


            button.innerHTML = `

                <i class="fa-solid fa-location-crosshairs"></i>

                موقعي الحالي

            `;


            let message =
                "لم نتمكن من تحديد موقعك.";


            if (
                error.code ===
                error.PERMISSION_DENIED
            ) {

                message =
                    "يجب السماح للموقع من إعدادات المتصفح.";

            }


            alert(message);

        },


        {

            enableHighAccuracy:
                true,

            timeout:
                10000,

            maximumAge:
                0

        }

    );

}


/* =====================================================
   SEARCH AREA
===================================================== */

async function searchArea() {

    const input =
        document.getElementById(
            "areaInput"
        );


    const area =
        input.value.trim();


    if (!area) {

        alert(
            "اكتب اسم المنطقة أولًا."
        );

        return;

    }


    showLoading();


    try {

        const location =
            await geocodeArea(
                area
            );


        if (!location) {

            alert(
                "لم نتمكن من العثور على المنطقة."
            );

            hideLoading();

            return;

        }


        const lat =
            location.lat;

        const lng =
            location.lng;


        currentLocation = {
            lat,
            lng
        };


        map.setView(
            [lat, lng],
            14
        );


        document
            .getElementById(
                "currentLocationText"
            )
            .textContent =
            `الموقع: ${location.name}`;


        if (userMarker) {

            map.removeLayer(
                userMarker
            );

        }


        userMarker =
            L.marker(
                [lat, lng]
            )
            .addTo(map)
            .bindPopup(
                location.name
            );


        const elements =
            await fetchNearbyPlaces(
                lat,
                lng
            );


        allShops =
            convertPlaces(
                elements
            );


        currentCategory =
            "all";


        document
            .getElementById(
                "searchInput"
            )
            .value =
            "";


        updateActiveCategory();


        filterShops();


    } catch (error) {

        console.error(error);

        alert(
            "حدث خطأ أثناء البحث عن المنطقة."
        );

    }


    hideLoading();

}


/* =====================================================
   GEOCODING
===================================================== */

async function geocodeArea(
    area
) {

    const url =
        "https://nominatim.openstreetmap.org/search" +

        "?format=json" +

        "&limit=1" +

        "&countrycodes=eg" +

        "&accept-language=ar" +

        "&q=" +

        encodeURIComponent(area);


    const response =
        await fetch(
            url
        );


    if (!response.ok) {

        throw new Error(
            "Geocoding failed"
        );

    }


    const data =
        await response.json();


    if (!data.length) {

        return null;

    }


    return {

        lat:
            parseFloat(
                data[0].lat
            ),

        lng:
            parseFloat(
                data[0].lon
            ),

        name:
            data[0].display_name

    };

}


/* =====================================================
   CATEGORY BUTTONS
===================================================== */

function setupCategoryButtons() {

    const buttons =
        document.querySelectorAll(
            ".quick-category, .category-card"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    currentCategory =
                        button.dataset.category;


                    updateActiveCategory();


                    filterShops();


                    document
                        .getElementById(
                            "explore"
                        )
                        .scrollIntoView({
                            behavior:
                                "smooth"
                        });

                }
            );

        }
    );

}


/* =====================================================
   ACTIVE CATEGORY
===================================================== */

function updateActiveCategory() {

    document
        .querySelectorAll(
            ".quick-category"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );


                if (
                    button.dataset.category ===
                    currentCategory
                ) {

                    button.classList.add(
                        "active"
                    );

                }

            }
        );

}


/* =====================================================
   SEARCH INPUT
===================================================== */

function setupSearch() {

    const input =
        document.getElementById(
            "searchInput"
        );


    input.addEventListener(
        "input",
        () => {

            filterShops();

        }
    );

}


/* =====================================================
   SHOW ALL
===================================================== */

function setupShowAll() {

    document
        .getElementById(
            "showAllBtn"
        )
        .addEventListener(
            "click",
            () => {

                currentCategory =
                    "all";


                document
                    .getElementById(
                        "searchInput"
                    )
                    .value =
                    "";


                updateActiveCategory();

                filterShops();

            }
        );

}


/* =====================================================
   MOBILE MENU
===================================================== */

function setupMobileMenu() {

    const menu =
        document.getElementById(
            "mobileMenu"
        );


    const open =
        document.getElementById(
            "mobileMenuBtn"
        );


    const close =
        document.getElementById(
            "closeMenu"
        );


    open.addEventListener(
        "click",
        () => {

            menu.classList.add(
                "active"
            );

        }
    );


    close.addEventListener(
        "click",
        () => {

            menu.classList.remove(
                "active"
            );

        }
    );


    menu
        .querySelectorAll("a")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        menu.classList.remove(
                            "active"
                        );

                    }
                );

            }
        );

}


/* =====================================================
   AREA SEARCH BUTTON
===================================================== */

function setupAreaSearch() {

    document
        .getElementById(
            "areaSearchBtn"
        )
        .addEventListener(
            "click",
            searchArea
        );


    document
        .getElementById(
            "areaInput"
        )
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    searchArea();

                }

            }
        );

}


/* =====================================================
   ADD SHOP
===================================================== */

function setupAddShop() {

    document
        .getElementById(
            "addShopBtn"
        )
        .addEventListener(
            "click",
            () => {

                alert(
                    "صفحة إضافة المحل سيتم ربطها بقاعدة البيانات في المرحلة التالية."
                );

            }
        );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeMap();

        setupCategoryButtons();

        setupSearch();

        setupShowAll();

        setupMobileMenu();

        setupAreaSearch();

        setupAddShop();

        updateActiveCategory();

    }
    
);