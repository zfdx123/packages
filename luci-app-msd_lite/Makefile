#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-msd_lite

LUCI_TITLE:=LuCI app for msd_lite
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+msd_lite
LUCI_DESCRIPTION:=LuCI support for msd_lite

define Package/luci-app-msd_lite/conffiles
/etc/config/msd_lite
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature