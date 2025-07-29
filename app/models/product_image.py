from datetime import datetime
from typing import Optional
from uuid import uuid4
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, Integer, Text, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ImageType(str, Enum):
    """Image type enumeration."""
    MAIN = "main"           # Primary product image
    GALLERY = "gallery"     # Additional gallery images
    THUMBNAIL = "thumbnail" # Thumbnail images
    VARIANT = "variant"     # Variant-specific images
    ZOOM = "zoom"          # High-resolution zoom images
    LIFESTYLE = "lifestyle" # Lifestyle/context images
    DETAIL = "detail"       # Detail/close-up images


class ProductImage(Base):
    __tablename__ = "product_images"
    __table_args__ = (
        Index("idx_product_images_product_id", "product_id"),
        Index("idx_product_images_variant_id", "variant_id"),
        Index("idx_product_images_type", "image_type"),
        Index("idx_product_images_is_primary", "is_primary"),
        Index("idx_product_images_sort_order", "sort_order"),
        Index("idx_product_images_is_active", "is_active"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    
    # Image can belong to either product or variant (or both)
    product_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("products.id"), nullable=False
    )
    variant_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("product_variants.id"), nullable=True
    )
    
    # Image details
    image_type: Mapped[ImageType] = mapped_column(
        SQLEnum(ImageType), nullable=False, default=ImageType.GALLERY
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[Optional[str]] = mapped_column(String(255))
    title: Mapped[Optional[str]] = mapped_column(String(255))
    caption: Mapped[Optional[str]] = mapped_column(Text)
    
    # Image metadata
    file_name: Mapped[Optional[str]] = mapped_column(String(255))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)  # in bytes
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    width: Mapped[Optional[int]] = mapped_column(Integer)
    height: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Display options
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # CDN/Storage information
    storage_provider: Mapped[Optional[str]] = mapped_column(String(50))  # "s3", "cloudinary", etc.
    storage_path: Mapped[Optional[str]] = mapped_column(String(500))
    cdn_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Responsive image variants
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    medium_url: Mapped[Optional[str]] = mapped_column(String(500))
    large_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    # SEO and accessibility
    seo_title: Mapped[Optional[str]] = mapped_column(String(200))
    seo_description: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="images")
    variant: Mapped[Optional["ProductVariant"]] = relationship(
        "ProductVariant", back_populates="images"
    )

    def __repr__(self) -> str:
        return f"<ProductImage(id={self.id}, type={self.image_type}, primary={self.is_primary})>"

    @property
    def is_variant_specific(self) -> bool:
        """Check if this image is specific to a variant."""
        return self.variant_id is not None

    @property
    def aspect_ratio(self) -> Optional[float]:
        """Calculate the aspect ratio of the image."""
        if self.width and self.height and self.height > 0:
            return self.width / self.height
        return None

    @property
    def file_size_mb(self) -> Optional[float]:
        """Get file size in megabytes."""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return None

    @property
    def dimensions_str(self) -> Optional[str]:
        """Get dimensions as formatted string."""
        if self.width and self.height:
            return f"{self.width} x {self.height}"
        return None

    def get_responsive_url(self, size: str = "original") -> str:
        """Get the appropriate URL for the requested size."""
        size_mapping = {
            "thumbnail": self.thumbnail_url,
            "medium": self.medium_url,
            "large": self.large_url,
            "original": self.url
        }
        
        return size_mapping.get(size, self.url) or self.url

    def get_optimal_url(self, max_width: Optional[int] = None) -> str:
        """Get the most appropriate URL based on required width."""
        if not max_width:
            return self.url
        
        # Choose the smallest image that's still larger than required width
        if max_width <= 150 and self.thumbnail_url:
            return self.thumbnail_url
        elif max_width <= 500 and self.medium_url:
            return self.medium_url
        elif max_width <= 1200 and self.large_url:
            return self.large_url
        else:
            return self.url

    def set_as_primary(self) -> None:
        """Set this image as the primary image for its product/variant."""
        # Note: In a real implementation, you'd want to ensure only one primary image
        # per product/variant combination. This would typically be handled in the service layer.
        self.is_primary = True
        self.image_type = ImageType.MAIN

    def generate_alt_text(self) -> str:
        """Generate alt text based on product and variant information."""
        if self.alt_text:
            return self.alt_text
        
        parts = []
        if self.product:
            parts.append(self.product.name)
        
        if self.variant and self.variant.title:
            parts.append(f"- {self.variant.title}")
        
        if self.image_type != ImageType.MAIN:
            parts.append(f"({self.image_type.value} view)")
        
        return " ".join(parts) if parts else "Product image"

    def update_metadata(self, width: int, height: int, file_size: int, mime_type: str) -> None:
        """Update image metadata."""
        self.width = width
        self.height = height
        self.file_size = file_size
        self.mime_type = mime_type

    def set_responsive_urls(self, thumbnail: str, medium: str, large: str) -> None:
        """Set responsive image URLs."""
        self.thumbnail_url = thumbnail
        self.medium_url = medium
        self.large_url = large

    def is_web_optimized(self) -> bool:
        """Check if the image is optimized for web (reasonable file size and format)."""
        if not self.file_size or not self.mime_type:
            return False
        
        # Check file size (under 2MB for web optimization)
        if self.file_size > 2 * 1024 * 1024:
            return False
        
        # Check format (web-friendly formats)
        web_formats = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"]
        return self.mime_type.lower() in web_formats