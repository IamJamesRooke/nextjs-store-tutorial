import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {faker} from '@faker-js/faker'
import FormInput from "@/components/form/FormInput";

const createProductAction = async(formData:FormData) => {
  'use server'
  const name = formData.get('name') as string;
  console.log(name)
}

function CreateProductPage() {
  const name = faker.commerce.productName()
  const company = faker.company.name()
  const description = faker.lorem.paragraph({min:10, max: 12})
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-8 capitalize">
        create product
      </h1>
      <div className="border p-8 rounded-mb">
        <form action={createProductAction}>
          <div className="mb-2">
            <FormInput name={name} type='text' label='product name' defaultValue={name} />
            <Button type="submit" size='lg'>
              Submit
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
export default CreateProductPage
