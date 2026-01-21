from decimal import Decimal

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from django.core.validators import MinValueValidator


class Category(models.Model):
    vendor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories"
    )

    name = models.CharField(max_length=100)
    slug = models.SlugField(blank=True)

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("vendor", "slug")
        ordering = ["sort_order", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:255]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class SubCategory(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="subcategories"
    )

    vendor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subcategories"
    )

    name = models.CharField(max_length=100)
    slug = models.SlugField(blank=True)

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("category", "vendor", "slug")
        ordering = ["sort_order", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:255]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category.name} → {self.name}"


class Product(models.Model):
    DISCOUNT_PERCENT = "PERCENT"
    DISCOUNT_FIXED = "FIXED"
    DISCOUNT_CHOICES = [
        (DISCOUNT_PERCENT, "PERCENT"),
        (DISCOUNT_FIXED, "FIXED"),
    ]

    vendor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
        null=True,
        blank=True
    )

    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)

    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    subcategory = models.ForeignKey(SubCategory, on_delete=models.SET_NULL, null=True, blank=True)

    description = models.TextField(blank=True)

    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    stock = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    sku = models.CharField(max_length=64, unique=True, null=True, blank=True)

    discount_type = models.CharField(max_length=10, choices=DISCOUNT_CHOICES, null=True, blank=True)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_start = models.DateTimeField(null=True, blank=True)
    discount_end = models.DateTimeField(null=True, blank=True)

    brand = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:230] or "product"
            slug = base
            i = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                i += 1
                slug = f"{base}-{i}"[:255]
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    # =========================
    # ✅ DISCOUNT HELPERS (NEW)
    # =========================
    @property
    def discount_active(self) -> bool:
        """
        Active when:
        - discount_type exists
        - discount_value > 0
        - within optional start/end window
        """
        if not self.discount_type or self.discount_value is None:
            return False

        try:
            dv = Decimal(str(self.discount_value))
        except Exception:
            return False

        if dv <= 0:
            return False

        # sanity checks (extra safety)
        if self.discount_type == self.DISCOUNT_PERCENT and dv > 100:
            return False

        now = timezone.now()
        if self.discount_start and now < self.discount_start:
            return False
        if self.discount_end and now > self.discount_end:
            return False

        return True

    def get_final_price(self) -> Decimal:
        """
        Returns discounted price if discount is active, otherwise original price.
        Always >= 0.
        """
        price = Decimal(str(self.price or "0"))

        if not self.discount_active:
            return price.quantize(Decimal("0.01"))

        dv = Decimal(str(self.discount_value))

        if self.discount_type == self.DISCOUNT_PERCENT:
            final = price * (Decimal("100") - dv) / Decimal("100")
        else:  # FIXED
            final = price - dv

        if final < 0:
            final = Decimal("0")

        return final.quantize(Decimal("0.01"))

    def get_discount_amount(self) -> Decimal:
        price = Decimal(str(self.price or "0")).quantize(Decimal("0.01"))
        final = self.get_final_price()
        amt = (price - final)
        if amt < 0:
            amt = Decimal("0")
        return amt.quantize(Decimal("0.01"))


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="images",
        on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to="products/")

    # ✅ already in your file
    sort_order = models.IntegerField(default=0)

    def __str__(self):
        return f"Image for {self.product.name}"
