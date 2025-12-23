export const getPagination = (req) => {
  let { page = 1, limit = 10 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const getPaginatedResponse = (
  data,
  total,
  page,
  limit,
  fieldName = "data"
) => {
  return {
    [fieldName]: data, 
    pagination: {
      totalItems: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
