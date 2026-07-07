// models/address.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const AddressSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  lead: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
  address1: { type: String },
  address2: { type: String },
  city: { type: String },
  state: { type: String },
  pinCode: { type: String },
  country: { type: String }
}, { timestamps: true });

const Address = mongoose.model("Address", AddressSchema);

export default Address;