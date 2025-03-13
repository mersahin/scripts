// ==UserScript==
// @name         Amazon Sipariş Bilgisi Çıkarıcı (Gelişmiş, Çoklu Sayfa, LocalStorage)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Amazon sipariş sayfalarından detaylı bilgi çıkarır ve CSV olarak sunar (çoklu sayfa, localStorage, Excel uyumlu).
// @author       ChatGPT & Mehmet Ersahin
// @match        https://www.amazon.de/your-orders/orders*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .csv-download-link {
            display: block;
            margin: 20px auto;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-align: center;
            text-decoration: none;
            font-size: 16px;
            border-radius: 5px;
            width: 200px;
        }
        .csv-download-link:hover {
            background-color: #367C39;
        }
    `);

    const localStorageKey = 'amazonOrders';

    function extractOrderData() {
        let orders = [];
        $('.order-card').each(function() {
            let orderData = {};

            // Order Number
            let orderNumber = $(this).find('.a-color-secondary:contains("Bestellnr.")').next().text().trim();
            orderData["Order Number"] = orderNumber;

            // 'aok-break-word' sınıfına sahip tüm öğeleri bul ve verilerini al
            $(this).find('.aok-break-word').each(function(index) {
                let key = "data_" + index;
                orderData[key] = $(this).text().trim();
            });

            orders.push(orderData);
        });
        return orders;
    }

    function convertToCSV(orders) {
        if (orders.length === 0) {
            return "";
        }

        // İlk sipariş kartından başlıkları al
        let headers = Object.keys(orders[0]);
        const csvHeader = headers.join(";") + "\n";

        const csvRows = orders.map(order => {
            let values = headers.map(header => {
                let value = order[header] || "";  // If value is undefined or null, default to an empty string
                // CSV'de noktalı virgül ve çift tırnak sorunlarını önlemek için
                value = value.replace(/;/g, ",").replace(/"/g, '""');
                return `"${value}"`;
            });
            return values.join(";");
        });

        return csvHeader + csvRows.join('\n');
    }

    function downloadCSV(csv) {
        let filename = 'amazon_orders.csv';
        let csvFile;
        let downloadLink;

        csvFile = new Blob([csv], {type: "text/csv;charset=utf-8"}); // Excel için UTF-8 kodlaması önemli
        downloadLink = document.createElement("a");
        downloadLink.classList.add('csv-download-link');
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "block";
        downloadLink.textContent = "CSV İndir";

        document.body.appendChild(downloadLink);
    }

    function goToNextPage() {
        let nextPageLink = $('ul.a-pagination li.a-last a');
        if (nextPageLink.length > 0) {
            window.location.href = nextPageLink[0].href;
        } else {
            // Son sayfaya geldik, localStorage'dan verileri al, CSV'yi oluştur ve indir
            let storedOrders = JSON.parse(GM_getValue(localStorageKey, '[]'));
            let csvData = convertToCSV(storedOrders);

            if (csvData) {
                downloadCSV(csvData);
                GM_setValue(localStorageKey, '[]'); // localStorage'ı temizle
            } else {
                alert("Veri bulunamadı!");
            }
        }
    }

    $(document).ready(function() {
        let orders = extractOrderData();

        // localStorage'dan mevcut verileri al, yeni verileri ekle ve localStorage'a geri kaydet
        let storedOrders = JSON.parse(GM_getValue(localStorageKey, '[]'));
        storedOrders = storedOrders.concat(orders);
        GM_setValue(localStorageKey, JSON.stringify(storedOrders));

        goToNextPage();
    });
})();
