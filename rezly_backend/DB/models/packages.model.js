import { Schema, model } from "mongoose";
import slugify from "slugify";

const packageSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      index: true, // بس index بدون unique
    },
    description: {
      type: String,
    },
    price_cents: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 3,
      uppercase: true,
    },
    price_type: {
      type: String,
      required: true,
      enum: ["OneTime", "Recurring"],
    },
    duration_value: {
      type: Number,
      required: true,
      min: 1,
    },
    duration_unit: {
      type: String,
      required: true,
      enum: ["Days", "Weeks", "Months", "Years", "يوم", "أيام"],
    },
    auto_renew: {
      type: Boolean,
      default: false,
    },
    trial_days: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware لتوليد slug فريد
/*packageSchema.pre("save", async function (next) {
  if (this.isModified("name")) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // تأكد إنه الـ slug ما يتكرر
    while (await Package.exists({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});*/

const Package = model("Package", packageSchema);
export default Package;
