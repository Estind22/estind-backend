import mongoose from "mongoose";

const CompanyDetailsSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  about: { type: String },
  logo: { type: String }
}, { timestamps: true });

export const CompanyDetails = mongoose.model("CompanyDetails", CompanyDetailsSchema);
export default CompanyDetails;
