from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from cart.manager import cart_manager
from cart.sync import cart_sync
from agent.tools import parse_checkout_result

router = APIRouter(prefix="/api/cart", tags=["cart"])


class AddItemRequest(BaseModel):
    product_id: str
    quantity: int = 1


class UpdateItemRequest(BaseModel):
    quantity: int


class CheckoutInfoRequest(BaseModel):
    recipient: dict | None = None
    delivery: dict | None = None
    sender: dict | None = None
    gift_message: str | None = None


class BudgetRequest(BaseModel):
    budget_max: int | None = None


@router.get("/{session_id}")
async def get_cart(session_id: str):
    cart = await cart_manager.get_cart(session_id)
    total = sum(i["price"] * i["quantity"] for i in cart.get("items", []))
    return {"cart": cart, "total": total}


@router.post("/{session_id}/add")
async def add_item(session_id: str, req: AddItemRequest):
    from mcp.client import mcp_client
    from agent.tools import parse_product_markdown

    raw = await mcp_client.call_tool("kapruka_get_product", {"product_id": req.product_id})

    product_data = parse_product_markdown(raw) if isinstance(raw, str) else {
        "name": req.product_id, "price": 0, "image_url": ""
    }

    if not product_data["name"]:
        product_data["name"] = req.product_id

    cart_product = {
        "product_id": req.product_id,
        "name": product_data["name"],
        "price": product_data["price"],
        "image_url": product_data["image_url"],
    }

    cart = await cart_manager.add_item(session_id, cart_product, quantity=req.quantity, added_by="manual")
    await cart_sync.broadcast(session_id, {"type": "cart_updated", "cart": cart})
    total = sum(i["price"] * i["quantity"] for i in cart.get("items", []))
    return {"cart": cart, "total": total}


@router.patch("/{session_id}/item/{product_id}")
async def update_item(session_id: str, product_id: str, req: UpdateItemRequest):
    cart = await cart_manager.update_quantity(session_id, product_id, req.quantity)
    await cart_sync.broadcast(session_id, {"type": "cart_updated", "cart": cart})
    total = sum(i["price"] * i["quantity"] for i in cart.get("items", []))
    return {"cart": cart, "total": total}


@router.delete("/{session_id}/item/{product_id}")
async def remove_item(session_id: str, product_id: str):
    cart = await cart_manager.remove_item(session_id, product_id)
    await cart_sync.broadcast(session_id, {"type": "cart_updated", "cart": cart})
    total = sum(i["price"] * i["quantity"] for i in cart.get("items", []))
    return {"cart": cart, "total": total}


@router.delete("/{session_id}")
async def clear_cart(session_id: str):
    cart = await cart_manager.clear_cart(session_id)
    await cart_sync.broadcast(session_id, {"type": "cart_updated", "cart": cart})
    return {"cart": cart, "total": 0}


@router.post("/{session_id}/checkout-info")
async def update_checkout_info(session_id: str, req: CheckoutInfoRequest):
    fields = {}
    if req.recipient is not None:
        fields["recipient"] = req.recipient
    if req.delivery is not None:
        fields["delivery"] = req.delivery
    if req.sender is not None:
        fields["sender"] = req.sender
    if req.gift_message is not None:
        fields["gift_message"] = req.gift_message

    cart = await cart_manager.update_checkout_info(session_id, **fields)
    return {"cart": cart}


@router.post("/{session_id}/checkout")
async def checkout_cart(session_id: str):
    from agent.tools import _checkout

    result = await _checkout(session_id)
    if isinstance(result, str):
        if result == "Cart is empty. Add items before checking out.":
            raise HTTPException(status_code=400, detail=result)
        if result.startswith("MISSING_INFO:"):
            missing = [field.strip() for field in result.removeprefix("MISSING_INFO:").split(",") if field.strip()]
            raise HTTPException(status_code=400, detail="Missing checkout information", headers={"X-Checkout-Missing": ",".join(missing)})

    order = parse_checkout_result(str(result))
    if not order.get("payment_url") and not order.get("order_number"):
        raise HTTPException(status_code=502, detail="Checkout completed without a usable payment response")

    cart = await cart_manager.get_cart(session_id)
    total = sum(i["price"] * i["quantity"] for i in cart.get("items", []))
    return {"order": order, "cart": cart, "total": total}


@router.patch("/{session_id}/budget")
async def update_budget(session_id: str, req: BudgetRequest):
    cart = await cart_manager.update_budget(session_id, req.budget_max)
    await cart_sync.broadcast(session_id, {"type": "cart_updated", "cart": cart})
    total = sum(i["price"] * i["quantity"] for i in cart.get("items", []))
    return {"cart": cart, "total": total}
