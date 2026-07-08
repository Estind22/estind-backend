import mongoose from "mongoose";

const CompanyDetailsSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  instagramLink: { type: String, default: "" },
  linkedinLink: { type: String, default: "" },
  whatsappNumber: { type: String, default: "" },
  facebookLink: { type: String, default: "" },
  youtubeLink: { type: String, default: "" },
  twitterLink: { type: String, default: "" },
}, { timestamps: true });

export const CompanyDetails = mongoose.model("CompanyDetails", CompanyDetailsSchema);
export default CompanyDetails;
