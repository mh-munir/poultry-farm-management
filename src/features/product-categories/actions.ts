'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';

const categorySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, 'Category name must be at least 2 characters long.'),
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters long.').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  description: z.string().trim().max(250).optional().or(z.literal('')),
  isActive: z.boolean().default(true)
});

function normalizeCategoryInput(formData: FormData) {
  return {
    id: formData.get('id')?.toString() || undefined,
    name: formData.get('name')?.toString() ?? '',
    slug: formData.get('slug')?.toString() ?? '',
    description: formData.get('description')?.toString() ?? '',
    isActive: formData.get('isActive') === 'on'
  };
}

export async function createOrUpdateCategory(formData: FormData) {
  await requireUser();
  const parsed = categorySchema.safeParse(normalizeCategoryInput(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    redirect(`/dashboard/product-categories?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;
  const payload = {
    name: data.name.trim(),
    slug: data.slug.trim(),
    description: data.description?.trim() || null,
    isActive: data.isActive
  };

  try {
    if (data.id) {
      await prisma.productCategory.update({
        where: { id: data.id },
        data: payload
      });
    } else {
      await prisma.productCategory.create({ data: payload });
    }
  } catch (error) {
    redirect('/dashboard/product-categories?error=' + encodeURIComponent('Category save failed. Please verify the data and try again.'));
  }

  revalidatePath('/dashboard/product-categories');
  redirect('/dashboard/product-categories?success=' + encodeURIComponent(data.id ? 'Category updated successfully.' : 'Category created successfully.'));
}

export async function deleteCategory(formData: FormData) {
  await requireUser();
  const categoryId = Number(formData.get('categoryId'));

  if (!categoryId) {
    redirect('/dashboard/product-categories?error=' + encodeURIComponent('A valid category id is required.'));
  }

  try {
    await prisma.productCategory.delete({ where: { id: categoryId } });
  } catch (error) {
    redirect('/dashboard/product-categories?error=' + encodeURIComponent('Category deletion failed.'));
  }

  revalidatePath('/dashboard/product-categories');
  redirect('/dashboard/product-categories?success=' + encodeURIComponent('Category deleted successfully.'));
}

export async function getCategoryPageData({
  page,
  search
}: {
  page: number;
  search?: string;
}) {
  const take = 8;
  const skip = (Math.max(page, 1) - 1) * take;

  const where: Prisma.ProductCategoryWhereInput = search?.trim()
    ? {
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' as Prisma.QueryMode } },
          { slug: { contains: search.trim(), mode: 'insensitive' as Prisma.QueryMode } },
          { description: { contains: search.trim(), mode: 'insensitive' as Prisma.QueryMode } }
        ]
      }
    : {};

  try {
    const [categories, total] = await Promise.all([
      prisma.productCategory.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.productCategory.count({ where })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / take));

    return {
      categories,
      total,
      totalPages,
      page: Math.min(page, totalPages)
    };
  } catch (error) {
    return {
      categories: [],
      total: 0,
      totalPages: 1,
      page: Math.max(page, 1)
    };
  }
}

export async function getCategoryStats() {
  try {
    const [total, active] = await Promise.all([
      prisma.productCategory.count(),
      prisma.productCategory.count({ where: { isActive: true } })
    ]);

    return { total, active };
  } catch (error) {
    return { total: 0, active: 0 };
  }
}
