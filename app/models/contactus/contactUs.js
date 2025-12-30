import mongoose from "mongoose";

const contactUsSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    contact_number: {
      type: String,
      trim: true,
    },
    hospital_name: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    }
  },
  {
    timestamps: true,
  }
);

const ContactUs = mongoose.model("ContactUs", contactUsSchema);

export default ContactUs;
