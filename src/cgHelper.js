/**
 * Team Name:   Quasar
 * Description: Helper for Comparison Guru
 * 
 * Change History:  Apr 12, 2017    - Created 
 */

'use strict';

function CGDataHelper() {
}

/**
 * Extract the store name 
 * @param {*} store 
 */
CGDataHelper.prototype.getStoreName = function(store) {
    var storeName = "general";
    var storeNames = ["amazon", "bestbuy", "ebay", "walmart"];
    
    for (var i = 0; i < storeNames.length; i++) {
        if (store == storeNames[i]) {
            return storeNames[i];
        } else if (store == "best buy") {
            return "bestbuy";
        }
    }
    return storeName;
}

/**
 * Extract the product name and store if applicable
 * @param text - 
 */
CGDataHelper.prototype.getProductToSearch = function(text) {
    // Array to be returned
    var productInfo = {name: "", store: ""};
    
    // Split the "price of ", " in ", and store name
    var productToSearch = text.toLowerCase().split(" in ");
    productInfo.name = productToSearch[0];
    // Save the name of the store
    if (productToSearch.length >= 2) {
        productInfo.store = this.getStoreName(productToSearch[1].trim());
    } else {
        productInfo.store = this.getStoreName("");
    }

    return productInfo;
}

/**
 * Sets up the content of the Alexa card to be shown
 * @param events 
 */
CGDataHelper.prototype.setupCardContent = function(events) {
    var price = events.salePrice;
    if (price == null) {
        price = events.price
    }
    return "Price: " + price + " " + events.currency + "\n\nStore: " + events.store + "\n"+ events.url;
}

/**
 * Sets up the image of the product as part of the Alexa card to be shown
 */
CGDataHelper.prototype.setupProductImage = function(events) {
    var cardImage = "https://";
    // URL prefix containing store logo images
    var urlLogoPrefix = {
        "bestbuy": "https://s3.amazonaws.com/comparisonguru-pics/bestbuy.png",
        "walmart": "https://s3.amazonaws.com/comparisonguru-pics/walmart.png"
    };

    if (events.imageURL) {
        if (events.store == "bestbuy" || events.store == "walmart") {
            cardImage = urlLogoPrefix[events.store]
        } else {
            var strResult = (events.imageURL).split("://")
            cardImage += strResult[1];
        }
    }

    return cardImage;
}

/**
 * Parses the JSON payload and returns this as an array
 * @param {*} inputText 
 */
CGDataHelper.prototype.parseJson = function(inputText, paginationSize) {
    // console.log('parseJson get called');
    var products = new Array();

    // console.log(inputText);
    // Parse the input Text to convert string into JS object 
    try {
        var textJson = JSON.parse(inputText);

        // Setup the number of entries
        var maxSize = (textJson.length < paginationSize) ? textJson.length : paginationSize;

        // Return the first index of the array since this contain the cheapest price
        for (var index = 0; index < maxSize; index++) {
            textJson[index].name = (textJson[index].name).replace(/&/g, "and");
            products.push(textJson[index]);
        }
    } catch (e) {
    }
    return products;
}

module.exports = CGDataHelper;
