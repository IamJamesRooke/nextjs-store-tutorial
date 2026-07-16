import { deleteReviewAction, fetchProductReviewsByUser } from "@/utils/actions"
import ReviewCard from "@/components/reviews/ReviewCard"
import SectionTitle from "@/components/global/SectionTitle"
import FormContainer from "@/components/form/FormContainer"
import { IconButton } from "@/components/form/Buttons"

async function ReviewsPage () {
  const reviews = await fetchProductReviewsByUser()
  if(reviews.length === 0){
    return <SectionTitle text='No Reviews' />
  }
  return (
    <>
      <SectionTitle text='Your Reviews' />
      <section className="grid grid-cols-1 gap-8 mt-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reviews.map((review) => {
          
          const {comment, rating} = review
          const {name, image} = review.product
          const reviewInfo = {comment, rating, name, image}
          
          return (
            <ReviewCard key={review.id} reviewInfo={reviewInfo}> 
              <DeleteReview reviewId={review.id} />              
            </ReviewCard>
          )
        })}
      </section>
    </>
  )
}

const DeleteReview=({reviewId}:{reviewId:string}) => {
  const deleteReview = deleteReviewAction.bind(null, {reviewId})
  return <FormContainer action={deleteReview}>
    <IconButton actionType="delete" />
  </FormContainer>
}

export default ReviewsPage

