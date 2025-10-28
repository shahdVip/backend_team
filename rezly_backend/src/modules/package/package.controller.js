import Package from "../../../DB/models/packages.model.js";
import { arabicSlugify } from "../../Utils/ArabicSlug.js";
import { applyOffers } from "../../services/applyOffer.js";
import Offer from "../../../DB/models/offer.model.js";

// ==================== CREATE PACKAGE ====================
export const createPackage = async (req, res) => {
  try {
    const {
      name,
      description,
      price_cents,
      currency,
      price_type,
      duration_value,
      duration_unit,
      auto_renew,
      trial_days,
      active,
      startDate,
    } = req.body;

    // حساب endDate تلقائي حسب duration
    let endDate = null;
    if (duration_value && duration_unit) {
      const start = new Date(startDate);
      endDate = new Date(start);

      switch (duration_unit) {
        case "Days":
          endDate.setDate(start.getDate() + duration_value);
          break;
        case "Weeks":
          endDate.setDate(start.getDate() + duration_value * 7);
          break;
        case "Months":
          endDate.setMonth(start.getMonth() + duration_value);
          break;
        case "Years":
          endDate.setFullYear(start.getFullYear() + duration_value);
          break;
        default:
          return res.status(400).json({ message: "Invalid duration unit" });
      }
    }

    // التحقق من عدم وجود باقة مطابقة تمامًا
    const existingPackage = await Package.findOne({
      name,
      description,
      price_cents,
      currency,
      price_type,
      duration_value,
      duration_unit,
      auto_renew,
      trial_days,
      active,
    });

    if (existingPackage) {
      return res
        .status(400)
        .json({ message: "Package with identical data already exists" });
    }

    // إنشاء الباقة الجديدة
    const newPackage = new Package({
      name,
      slug: arabicSlugify(name),
      description,
      price_cents,
      currency,
      price_type,
      duration_value,
      duration_unit,
      auto_renew,
      trial_days,
      active,
      startDate,
      endDate,
    });

    await newPackage.save();

    res.status(201).json({
      message: "Package created successfully",
      package: newPackage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== LIST PACKAGES WITH OFFERS ====================
export const listPackages = async (req, res) => {
  try {
    const { active } = req.query;
    let filter = {};

    if (req.user && req.user.role === "Admin") {
      if (active === "true") filter.active = true;
      else if (active === "false") filter.active = false;
    } else {
      filter.active = true;
      if (active) {
        return res.status(403).json({
          message: "Only admins can filter packages by active status",
        });
      }
    }

    const packages = await Package.find(filter).sort({ createdAt: -1 });

    const result = [];
    for (const pkg of packages) {
      const pricing = await applyOffers(pkg);
      result.push({
        ...pkg.toObject(),
        pricing,
      });
    }
    res.status(200).json({
      message: "success",
      count: packages.length,
      packages: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== GET PACKAGE BY ID ====================
export const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const pkg = await Package.findById(id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    if (pkg.active === false && req.user?.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this package" });
    }

    const pricing = await applyOffers(pkg);

    res.status(200).json({ package: { ...pkg.toObject(), pricing } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== UPDATE PACKAGE ====================
export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const now = new Date();
    if (
      (updateData.startDate && new Date(updateData.startDate) < now) ||
      (updateData.endDate && new Date(updateData.endDate) < now)
    ) {
      return res
        .status(400)
        .json({ message: "Start and end dates must be in the future" });
    }

    if (updateData.name) {
      updateData.slug = arabicSlugify(updateData.name);
    }

    const updatedPackage = await Package.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPackage)
      return res.status(404).json({ message: "Package not found" });

    res.status(200).json({ message: "success", package: updatedPackage });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(400).json({ message: "Package name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
};

// ==================== DISABLE PACKAGE ====================
export const disablePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await Package.findById(id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    if (!pkg.active)
      return res.status(400).json({ message: "Package is already disabled" });

    pkg.active = false;
    await pkg.save();

    res.status(200).json({ message: "success", package: pkg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== ENABLE PACKAGE ====================
export const enablePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await Package.findById(id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    if (pkg.active)
      return res.status(400).json({ message: "Package is already active" });

    pkg.active = true;
    await pkg.save();

    res.status(200).json({ message: "success", package: pkg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
