import ContactUs from "../../models/contactus/contactUs.js";
import { getPagination, getPaginatedResponse } from "../../utils/pagination.js";
import { handleResponse } from "../../utils/responseHandler.js";


export const createContact = async (req, res) => {
    try {
      
    const { full_name, email, contact_number, hospital_name, message } = req.body;

    if (!full_name || !email || !message) {
      return handleResponse(res, 400, "full_name, email, and message are required");
    }

    const contactData = {
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
    };

    if (contact_number) contactData.contact_number = contact_number.trim();
    if (hospital_name) contactData.hospital_name = hospital_name.trim();

    const contact = await ContactUs.create(contactData);
    return handleResponse(res, 201, "Contact created successfully", contact);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};


export const getAllContacts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const total = await ContactUs.countDocuments();
    const contacts = await ContactUs.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const response = getPaginatedResponse(
      contacts,
      total,
      page,
      limit,
      "contacts"
    );

    return handleResponse(res, 200, "Contacts fetched successfully", response);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};


export const getContactById = async (req, res) => {
  try {
    const contact = await ContactUs.findById(req.params.id);

    if (!contact) {
      return handleResponse(res, 404, "Contact not found");
    }

    return handleResponse(res, 200, "Contact fetched successfully", contact);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};


export const updateContact = async (req, res) => {
  try {
      const { full_name, email, contact_number, hospital_name, message } = req.body;
      
    const updateData = {};
    if (full_name) updateData.full_name = full_name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (message) updateData.message = message.trim();
    if (contact_number) updateData.contact_number = contact_number.trim();
    if (hospital_name) updateData.hospital_name = hospital_name.trim();

    const contact = await ContactUs.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!contact) {
      return handleResponse(res, 404, "Contact not found");
    }

    return handleResponse(res, 200, "Contact updated successfully", contact);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};


export const deleteContact = async (req, res) => {
  try {
    const contact = await ContactUs.findByIdAndDelete(req.params.id);

    if (!contact) {
      return handleResponse(res, 404, "Contact not found");
    }

    return handleResponse(res, 200, "Contact deleted successfully");
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};
