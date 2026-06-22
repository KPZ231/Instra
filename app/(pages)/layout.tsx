import I18nProvider from "@/components/providers/I18nProvider";
import AuthProvider from "@/components/providers/AuthProvider";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import InstraToaster from "@/components/ui/InstraToaster";
import AnnouncementBar from "@/components/ui/AnnouncementBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <I18nProvider>
        <AnnouncementBar fixed />
        <Navbar></Navbar>
        {children}
        <Footer></Footer>
        <InstraToaster />
      </I18nProvider>
    </AuthProvider>
  );
}
