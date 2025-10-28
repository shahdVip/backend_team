
import Offer from "../../DB/models/offer.model.js";
export const applyOffers = async (pkg) => {
  const now = new Date();


  const offers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
    $or: [{ appliesTo: "all" }, { appliesTo: "package", packageId: pkg._id }],
  });

  let finalPrice = pkg.price_cents;
  let appliedOffers = [];


  for (const offer of offers) {
    if (offer.discountType === "percentage") {
      finalPrice -= (finalPrice * offer.discountValue) / 100;
    } else if (offer.discountType === "fixed") {
      finalPrice -= offer.discountValue;
    }
    appliedOffers.push(offer.title);
  }

  if (finalPrice < 0) finalPrice = 0;

  return {
    originalPrice: pkg.price_cents,
    finalPrice,
    currency: pkg.currency,
    appliedOffers,
  };
};