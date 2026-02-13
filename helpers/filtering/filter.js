console.log("filter.js loaded");

export function itemCardHtml(item, user, owner) {
  return `
        <div class="card h-100">
            ${cardImgHtml(item)}
            ${cardBodyHtml(item, user, owner)}
            ${cardFooterHtml(item)}
        </div>
    `;
}


function cardImgHtml(item) {
    const imgsrc = item.picture
    ? `/img/stores/items/${item.picture}`
    : `/img/stores/items/DefaultItem.png`;

    return `<img class="card-img-top" src="${imgsrc}" alt="${item.name} Image" style="height: 300px;">`;
}

function cardBodyHtml(item, user, owner) {
    return `<div class="card-body">
    <h5 class="card-title">${item.name}</h5>
    <p class="card-text" name="itemPrice">Price: £${item.price}</p>
    <div data-mdb-input-init class="form-outline d-flex flex-row mb-3" style="width: 10rem;">
                <label class="form-label me-2" for="itemQuantity">Quantity</label>
                <input min="1" max="10" placeholder="1" type="number" id="itemQuantity" class="form-control"
                  name="itemQuantity" />
              </div>
            
            ${cardButtonsHtml(user, owner, item)}
        </div>
              `;
}

function cardButtonsHtml(user, owner, item) {
    return `
        ${owner ? ` 
            <a href="/store/${item.store_id}/editItem/${item.item_id}" class="btn btn-secondary">
                Edit Item
            </a>
        ` : `
        ${user ? `
            <button type="submit" class="btn btn-primary">
                Reserve Item
            </button>
        `: ``}
        `}
    `;
}

function cardNutritionHtml(item) {
    const nutrition = item.nutrition;
    return `<ul class="list-group list-group-flush">
      ${nutrition.map(n => `<li class="list-group-item">${n.name}: ${n.value}</li>`).join('')}
    </ul>`;
}

function cardFooterHtml(item) {
    return `
        <div class="card-footer">
            <small class="text-body-secondary">${item.updated_at}</small>
        </div>
        `;
}