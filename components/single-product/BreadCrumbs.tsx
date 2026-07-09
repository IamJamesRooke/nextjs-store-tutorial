import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function BreadCrumbs({ name }: { name: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        
        {/* ROOT */}
        <BreadcrumbItem>
          <BreadcrumbLink href="/" className="capitalize text-lg">
            home
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {/* PRODUCTS */}
        <BreadcrumbItem>
          <BreadcrumbLink href="/products" className="capitalize text-lg">
            home
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {/* SINGLE PRODUCT */}
        <BreadcrumbItem>
          <BreadcrumbPage className="capitalize text-lg">{name}</BreadcrumbPage>
        </BreadcrumbItem>
        
      </BreadcrumbList>
    </Breadcrumb>
  );
}
export default BreadCrumbs;
