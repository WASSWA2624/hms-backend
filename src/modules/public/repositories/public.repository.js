/**
 * Public repository
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

const buildSearchFilter = (search) => {
  if (!search) {
    return undefined;
  }

  return {
    contains: search,
    mode: 'insensitive'
  };
};

const listPublicServices = async (search, skip, take, orderBy) => {
  try {
    const where = {
      deleted_at: null,
      is_active: true
    };

    if (search) {
      where.OR = [
        { name: buildSearchFilter(search) },
        { short_name: buildSearchFilter(search) }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          short_name: true,
          department_type: true,
          facility_id: true,
          branch_id: true
        }
      }),
      prisma.department.count({ where })
    ]);

    return { items, total };
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

const listPublicProviders = async (search, skip, take, orderBy) => {
  try {
    const where = {
      deleted_at: null
    };

    if (search) {
      where.OR = [
        { position: buildSearchFilter(search) },
        {
          user: {
            OR: [
              { first_name: buildSearchFilter(search) },
              { last_name: buildSearchFilter(search) }
            ]
          }
        }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.staff_profile.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          user_id: true,
          tenant_id: true,
          department_id: true,
          staff_number: true,
          position: true,
          user: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        }
      }),
      prisma.staff_profile.count({ where })
    ]);

    return { items, total };
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

const listPublicBranches = async (search, skip, take, orderBy) => {
  try {
    const where = {
      deleted_at: null,
      is_active: true
    };

    if (search) {
      where.name = buildSearchFilter(search);
    }

    const [items, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          tenant_id: true,
          facility_id: true,
          name: true,
          facility: {
            select: {
              id: true,
              name: true,
              facility_type: true
            }
          }
        }
      }),
      prisma.branch.count({ where })
    ]);

    return { items, total };
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listPublicServices,
  listPublicProviders,
  listPublicBranches
};
